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

  // Define the function to extract name, phone number, and service
 function extractInfo(transcription: string) {
   // Extract name, phone number, and service from transcription
   const nameMatch = transcription.match(/my name is\s+([a-zA-Z\s]+)/i);
   const phoneMatch = transcription.match(/\b\d{10}\b/); // Adjust regex to handle 10-digit phone numbers
   const serviceMatch = transcription.match(
     /(oil change|tire rotation|brake check|car wash|maintenance)/i
   );

   const name = nameMatch ? nameMatch[1].trim() : "Unknown";
   const phone = phoneMatch ? phoneMatch[0].trim() : "Unknown";
   const service = serviceMatch ? serviceMatch[0].trim() : "Unknown service";

   return { name, phone, service };
 }


  const extractedInfo = extractInfo(transcriptionText);
  const { name, phone, service } = extractedInfo;
  console.log("Extracted Info:", extractedInfo);

  const systemPrompt = `You are a highly capable and efficient AI receptionist for a car dealership named Pam Automotives. Your role is to assist users with their automotive service needs. Here’s how you should handle various scenarios:

Greeting and Introduction:

When a user starts the conversation with "Hi, Hello, etc", greet them with: "Hi, this is Pam Automotives. How can I help you today?"
Service Requests:

If a user requests an automotive service (e.g., "I need an oil change," "Can I get a tire change?" "I want my car serviced"), respond with:
"I can help with that. Can I have your name and phone number, please?"
Collecting User Information:

When the user provides their name and phone number, respond with:
"Thank you, [Name]. We have your phone number as [Phone Number]. Your appointment for [Service] is now booked. Is there anything else I can assist you with?"
Handling Additional Queries:

If the user provides additional information or asks questions beyond the initial request, ensure that you address them appropriately based on the context of their request.
End of Conversation:

If the user says "that's all" or indicates they are done, respond with:
"Okay, thank you for calling. Have a great day!"
Fallback Responses:

If you don't understand the query or if it's outside your scope, reply with:
"I cannot answer that. Please contact our customer service for further assistance."

if there is a delay or silence from the user for about 4-5 seconds and there are no signs of indicating that they are. You need to wait`;

  const messages = [
    {
      role: "system",
      content: systemPrompt,
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
  // Firebase database
  // async function saveToFirebase(
  //   caller: string,
  //   phone: string,
  //   service: string
  // ) {
  //   try {
  //     await setDoc(doc(db, "appointments", phone), {
  //       caller,
  //       phone,
  //       service,
  //       timestamp: new Date().toISOString(),
  //     });
  //     console.log("Appointment saved successfully!");
  //   } catch (error) {
  //     console.error("Error saving appointment:", error);
  //   }
  // }
  // if (previousResponse.includes("can i have your name and phone number")) {
  //   const extractedInfo = extractInfo(transcriptionText);
  //   assistantMessage = `Your name is ${extractedInfo[0]} and your number is ${extractedInfo[1]}. Your appointment is booked for ${extractedInfo[2]}. Thank you for calling.`;

  //   // Save to Firebase
  //   await saveToFirebase(extractedInfo[0], extractedInfo[1], extractedInfo[2]);
  // }

}

export default transcript;
