
import { google } from "googleapis";
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const auth = new google.auth.OAuth2(
      process.env.GCP_CLIENT_ID,
      process.env.GCP_CLIENT_SECRET,
      process.env.GCP_REDIRECT_URI
    );

    auth.setCredentials({
      refresh_token: process.env.GCP_REFRESH_TOKEN,
    });

    const classroom = google.classroom({ version: "v1", auth });
    const result = await classroom.courses.list();
    res.status(200).json(result.data.courses || []);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch classroom courses" });
  }
}
