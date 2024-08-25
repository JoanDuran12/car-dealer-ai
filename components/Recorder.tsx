"use client"; 

import Image from "next/image"; 
import { useEffect, useRef, useState } from "react"; 
import activeAssistantIcon from "@/img/active.gif"; 
import notActiveAssistantIcon from "@/img/notactive.png"; 
import { useFormStatus } from "react-dom"; 

const mimeType = "audio/webm"; 

function Recorder({ uploadAudio }: { uploadAudio: (blob: Blob) => void }) {
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const { pending } = useFormStatus();
  const [permission, setPermission] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [recordingStatus, setRecordingStatus] = useState("inactive");
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [audio, setAudio] = useState<string | null>(null);
  const pitchRef = useRef<number | null>(null); // Store detected pitch

  useEffect(() => {
    getMicrophonePermission();
  }, []);

  const getMicrophonePermission = async () => {
    if ("MediaRecorder" in window) {
      try {
        const streamData = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });
        setPermission(true);
        setStream(streamData);
      } catch (err: any) {
        alert(err.message);
      }
    } else {
      alert("The MediaRecorder API is not supported in your browser.");
    }
  };

  const startRecording = async () => {
    if (mediaRecorder === null || stream === null) return; // Do nothing if there is no MediaRecorder or MediaStream available.

    if (pending) return; // Prevent recording if a form submission is currently pending.

    setRecordingStatus("recording"); // Set the recording status to "recording".
    // Create a new MediaRecorder instance using the stream and specified MIME type.
    const media = new MediaRecorder(stream, { mimeType: mimeType });
    // Store the MediaRecorder instance in the mediaRecorder ref.
    mediaRecorder.current = media;
    // Invoke the start method to begin recording.
    mediaRecorder.current.start();
    let localAudioChunks: Blob[] = []; // Initialize an array to hold the audio data chunks.
    mediaRecorder.current.ondataavailable = (event) => {
      if (typeof event.data === "undefined") return; // Ignore undefined data events.
      if (event.data.size === 0) return; // Ignore empty data chunks.
      localAudioChunks.push(event.data); // Add the data chunk to the local array.
    };
    setAudioChunks(localAudioChunks); // Store the audio chunks in state.
  };


  const stopRecording = () => {
    if (!mediaRecorder.current) return;
    if (pending) return;

    setRecordingStatus("inactive");
    mediaRecorder.current.stop();

    mediaRecorder.current.onstop = () => {
      const audioBlob = new Blob(audioChunks, { type: mimeType });
      const audioUrl = URL.createObjectURL(audioBlob);
      setAudio(audioUrl);
      uploadAudio(audioBlob);
      setAudioChunks([]);

      // Cleanup
      if (audioContext.current) {
        audioContext.current.close();
        audioContext.current = null;
      }
      analyser.current = null;
    };
  };

  return (
    <div className="flex items-center justify-center">
      {!permission ? (
        <button onClick={getMicrophonePermission} type="button">
          Get Microphone
        </button>
      ) : null}

      {recordingStatus === "inactive" && permission && !pending ? (
        <Image
          src={notActiveAssistantIcon}
          alt="Not Recording"
          width={350}
          height={350}
          onClick={startRecording}
          priority={true}
          className="assistant cursor-pointer hover:scale-110 duration-150 transition-all ease-in-out"
        />
      ) : null}

      {recordingStatus === "recording" ? (
        <Image
          src={activeAssistantIcon}
          alt="Recording"
          width={350}
          height={350}
          onClick={stopRecording}
          priority={true}
          className="assistant cursor-pointer hover:scale-110 duration-150 transition-all ease-in-out"
        />
      ) : null}
    </div>
  );
}

export default Recorder;
