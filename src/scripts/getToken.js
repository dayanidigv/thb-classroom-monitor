// src/scripts/getToken.js
const { google } = require("googleapis");
const express = require("express");

const SCOPES = [
  "https://www.googleapis.com/auth/classroom.courses.readonly",
  "https://www.googleapis.com/auth/classroom.rosters.readonly",
  "https://www.googleapis.com/auth/classroom.coursework.students.readonly",
  "https://www.googleapis.com/auth/classroom.student-submissions.students.readonly",
  "https://www.googleapis.com/auth/classroom.topics.readonly",
  "https://www.googleapis.com/auth/classroom.announcements.readonly",
  "https://www.googleapis.com/auth/classroom.profile.emails",
  "https://www.googleapis.com/auth/classroom.profile.photos",
  "https://www.googleapis.com/auth/classroom.guardianlinks.students.readonly",
  "https://www.googleapis.com/auth/classroom.guardianlinks.me.readonly",
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/spreadsheets.readonly",
  "https://www.googleapis.com/auth/gmail.readonly"
];


const credentials = require("./client_secret.json");
const { client_secret, client_id, redirect_uris } = credentials.installed;

// Force redirect to localhost:2000
const oAuth2Client = new google.auth.OAuth2(
  client_id,
  client_secret,
  "http://localhost:2000/oauth2callback"
);

const app = express();

// Step 1: Generate Auth URL
app.get("/", (req, res) => {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    include_granted_scopes: false,
    prompt: "consent",
  });
  res.send(`<a href="${authUrl}">Authorize with Google Classroom</a>`);
});

// Step 2: Handle OAuth2 callback
app.get("/oauth2callback", async (req, res) => {
  const code = req.query.code;
  if (!code) {
    return res.status(400).send("No code returned from Google");
  }

  try {
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);

    // Display tokens for manual copying (development only)
    res.send(`
      <h2>Authorization Successful!</h2>
      <p><strong>Access Token:</strong> ${tokens.access_token}</p>
      <p><strong>Refresh Token:</strong> ${tokens.refresh_token}</p>
      <p>Copy these tokens to your .env.local file</p>
      <p>You can close this window now.</p>
    `);
  } catch (err) {
    console.error("Error retrieving access token", err);
    res.status(500).send("Authentication failed");
  }
});

// Start local server
app.listen(2000, () => {
  console.log("Token server started at http://localhost:2000");
  console.log("Visit the URL to authorize and get your tokens");
});
