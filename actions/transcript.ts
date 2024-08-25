"use server"

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
      response: "Sorry, I can't hear you. Can you please repeat yourself",
    };
  }

  console.log(">>", file);

  const arrayBuffer = await file.arrayBuffer();

  // --- Get audio transcription from OpenAI Whisper ----

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

  // --- Determine the appropriate delay time based on transcription ---

  const delayPrompt = `
  You are an AI designed to assess whether a person is likely done speaking based on a voice-to-text transcription and adjust your response time accordingly. Your task is to intelligently manage pauses by categorizing the transcription into one of three stages: 'Most Likely Not Done,' 'Maybe Not Done,' and 'Least Likely Not Done.' You will return one of the following outputs, without any additional text:

  "The person is most likely not done talking, I will wait for 3 seconds."
  "The person could be done talking but I'm not sure, I'll wait for 1.8 seconds to see if they speak again."
  "The person is definitely done talking, I will respond in 0.5 seconds just in case I'm wrong."
  Criteria for Analysis:
  
  Most Likely Not Done (Output 1):
  
  The transcription contains multiple fillers (e.g., "um," "uh," "like").
  The sentence appears incomplete or the thought is unfinished (e.g., "I think we should, um...").
  The speaker is listing or enumerating points (e.g., "First, we need to...").
  The statement or question is open-ended (e.g., "What do you think we should...?").
  
  Maybe Not Done (Output 2):
  
  The transcription includes phrases that suggest the speaker might continue (e.g., "And then we could...").
  The sentence ends with a single filler or hesitation (e.g., "So, uh...").
  The sentence lacks a strong closing, making it unclear if the speaker is finished (e.g., "That might be the best option...").
  
  Least Likely Not Done (Output 3):
  
  The transcription has clear closing statements (e.g., "That's all I have for now," "In conclusion...").
  The sentence is fully complete with a strong sense of closure (e.g., "I think we're done here.").
  The statement or question seeks confirmation or a response (e.g., "Does that make sense?").
  
  Based on the analysis, return the appropriate output:
  
  Most Likely Not Done: "The person is most likely not done talking, I will wait for 3 seconds."
  Maybe Not Done: "The person could be done talking but I'm not sure, I'll wait for 1.8 seconds to see if they speak again."
  Least Likely Not Done: "The person is definitely done talking, I will respond in 0.5 seconds just in case I'm wrong."

  `;

  const delayResponse = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: delayPrompt,
      },
      {
        role: "user",
        content: transcriptionText,
      },
    ],
    max_tokens: 25,
  });

  const delayTimeString = delayResponse.choices?.[0]?.message?.content?.trim() || "1";
  console.log(delayTimeString);

  // --- Get chat completion from OpenAI ----

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
    model: "gpt-4",
    messages: messages,
    max_tokens: 128,
  });

  const response = completionResponse.choices[0].message.content;

  console.log(prevState.sender, "+++", transcriptionText);

  return {
    sender: transcriptionText,
    response: response,
    id: id,
    delayTimeString: delayTimeString,  // Return the delay time along with the response
  };
}

export default transcript;
