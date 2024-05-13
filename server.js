import express from "express";
import { OpenAI } from "openai";
import cors from "cors";
import { initializeApp, applicationDefault, cert } from "firebase-admin/app";
import {
  getFirestore,
  Timestamp,
  FieldValue,
  Filter,
} from "firebase-admin/firestore";
import serviceAccount from "./serverAccountKey.json" assert { type: "json" };

const app = express();
const port = 3000;

initializeApp({
  credential: cert(serviceAccount),
});
const db = getFirestore();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const defaultPrompt = (
  uuid,
  owner,
  ownerName,
  theme
) => `Please generate three questions.
The theme of the question bank is: ${theme}

If the question bank is in Chinese, please use Traditional Chinese instead of Simplified Chinese.
Please respond in JSON.
The format is as follows:
{
  "editTime": "",
  "id": ${uuid},
  "name": "Test question bank", // generate a question name
  "owner": ${owner},
  "ownerName": ${ownerName},
  "questions": [
    {
      // multiple choice questions
      "isDone": true,
      "answer": 1, // the options index of answer between 0~3
      "id": "68062bb3-e088-49e0-b69b-8b1d5d9f347a", // new uuid
      "media": "",
      "options": ["", "", "", ""], //add four options
      "timeLimit": 10, // only 10, 20, 30, 60, 90, 120, 180
      "title": "How are you", //question
      "type": "mc"
    },
    {
      // true or false questions
      "isDone": true,
      "answer": 0, // the options index of answer, true:0 false:1
      "id": "1b50a28f-74e6-4962-9fb5-db1e9da450be", // new uuid
      "media": "",
      "options": ["T", "F"],
      "timeLimit": 10, // only 10, 20, 30, 60, 90, 120, 180
      "title": "How are you", //question
      "type": "tf"
    },
    {
      // short answer questions
      "isDone": true,
      "answer": "good", // the answer in string
      "id": "1b50a28f-74e6-4962-9fb5-db1e9da450be", // new uuid
      "media": "",
      "options": ["good"], // put answer string in array[0]
      "timeLimit": 10, // only 10, 20, 30, 60, 90, 120, 180
      "title": "How are you?", //question
      "type": "sa"
    }
  ]
}

`;

// const corsOptions = {
//   origin: "http://localhost:5173",
//   optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
// };

app.use(cors());

app.get("/openai/:uuid", async (req, res) => {
  try {
    const paramsUUID = req.params.uuid;
    const queryOwner = req.query.owner;
    const queryOwnerName = req.query.ownerName;
    const queryTheme = req.query.theme;
    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: defaultPrompt(
            paramsUUID,
            queryOwner,
            queryOwnerName,
            queryTheme
          ),
        },
      ],
      model: "gpt-4",
    });
    const docRef = db.collection("qbank").doc(paramsUUID);
    await docRef.set(JSON.parse(completion.choices[0].message.content));
    console.log(completion.choices[0].message.content);
    console.log(paramsUUID, queryOwner, queryOwnerName, queryTheme);
    res.status(200).json({ message: completion.choices[0].message.content });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
