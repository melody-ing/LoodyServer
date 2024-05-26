import express from "express";
import { OpenAI } from "openai";
import cors from "cors";
import "dotenv/config";
import admin from "firebase-admin";

const app = express();
const port = 3000;
app.use(express.json());

const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_KEY);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const defaultPrompt = ({
  queryQuantity,
  paramsUUID,
  queryOwner,
  queryOwnerName,
  queryTheme,
}) => `Please generate ${queryQuantity} ${(queryQuantity) =>
  queryQuantity === "1" ? "question" : "questions"}.
The theme of the question bank is: ${queryTheme}
If the question bank is in Chinese, please use Traditional Chinese instead of Simplified Chinese.
Please respond in JSON.
The format is as follows:
{
  "editTime": "",// don't filled in anything
  "id": ${paramsUUID}, // don't change the id that I gave you
  "name": "Test question bank", // generate a question name
  "owner": ${queryOwner}, // don't change the owner that I gave you
  "ownerName": ${queryOwnerName}, // don't change the ownerName that I gave you
  "questions": [
    {
      // multiple choice questions
      "isDone": true,
      "answer": 1, // the options index of answer between 0~3
      "id": "68062bb3-e088-49e0-b69b-8b1d5d9f347a", // new uuid
      "media": "",
      "options": ["", "", "", ""], //add four options
      "timeLimit": 10, // only 10, 20, 30, 60, 90, 120, 180
      "title": "How are you", //question (Don't over 40 letters)
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
      "title": "How are you", //question (Don't over 40 letters)
      "type": "tf"
    },
    {
      // short answer questions
      "isDone": true,
      "answer": "good", // The answer in string. If the answer is english, please make it all uppercase.
      "id": "1b50a28f-74e6-4962-9fb5-db1e9da450be", // new uuid
      "media": "",
      "options": ["good"], // put answer string in array[0]. If the answer is english, please make it all uppercase. 
      "timeLimit": 10, // only 10, 20, 30, 60, 90, 120, 180
      "title": "How are you?", //question (Don't over 40 letters)
      "type": "sa"
    }
  ]
}

`;

// const corsOptions = {
//   origin: [
//     "https://loody-ing.web.app/",
//     "https://loody.site/",
//     "http://localhost:5173",
//   ],
//   methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
//   allowedHeaders: ["Content-Type", "Authorization"],
//   optionsSuccessStatus: 200,
// };

// app.use(cors(corsOptions));
app.use();

app.get("/openai/:uuid", async (req, res) => {
  try {
    const paramsUUID = req.params.uuid;
    const queryOwner = req.query.owner;
    const queryOwnerName = req.query.ownerName;
    const queryTheme = req.query.theme;
    const queryQuantity = req.query.quantity;
    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: defaultPrompt({
            queryQuantity,
            paramsUUID,
            queryOwner,
            queryOwnerName,
            queryTheme,
          }),
        },
      ],
      model: "gpt-4",
    });
    const docRef = db.collection("qbank").doc(paramsUUID);
    await docRef.set(JSON.parse(completion.choices[0].message.content));
    console.log(completion.choices[0].message.content);
    console.log(
      queryQuantity,
      paramsUUID,
      queryOwner,
      queryOwnerName,
      queryTheme
    );
    res.status(200).json({ message: completion.choices[0].message.content });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
