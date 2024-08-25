"use server";
import { OpenAI } from "openai";

async function transcript(prevState: any, formData: FormData) {

  const id = Math.random().toString(36);

  console.log("PREVIOUS STATE:", prevState);
  if (process.env.OPENAI_API_KEY === undefined) {
    console.error("OpenAI API key not set");
    return {
      sender: "",
      response: "OpenAI API key not set",
    };
  }

  const file = formData.get("audio") as File;
  if (file.size === 0) {
    return {
      sender: "",
      response: "No audio file provided",
    };
  }

  console.log(">>", file);

  const arrayBuffer = await file.arrayBuffer();

  // ---   get audio transcription from OpenAI Whisper ----

  console.log("== Transcribe Audio Sample ==");

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const transcriptionResponse = await openai.audio.transcriptions.create({
    file: file,
    model: "whisper-1",
  });
  const transcriptionText = transcriptionResponse.text;
  console.log(`Transcription: ${transcriptionText}`);

  // ---   get chat completion from OpenAI ----

  const messages = [
    {
      role: "system",
      content:
        "You are a helpful assistant. You will answer questions and reply 'I cannot answer that' if you don't know the answer.",
    },
    { role: "user", content: transcriptionText },
  ];

  console.log(`Messages: ${messages.map((m) => m.content).join("\n")}`);

  const completionResponse = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: messages,
    max_tokens: 128,
  });

  const response = completionResponse.choices[0].message.content;

  console.log(prevState.sender, "+++", transcriptionText);
  return {
    sender: transcriptionText,
    response: response,
    id: id,
  };
}

export default transcript;
