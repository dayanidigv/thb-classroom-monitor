# Gemini AI Setup Guide

## Getting Your Gemini API Key

1. **Visit Google AI Studio**
   - Go to [makersuite.google.com](https://makersuite.google.com)
   - Sign in with your Google account

2. **Create API Key**
   - Click on "Get API Key" or "Create API Key"
   - Select "Create API key in new project" or choose an existing project
   - Copy the generated API key

3. **Configure Environment Variables**
   - Open your `.env.local` file in the project root
   - Add the following line:
   ```
   GEMINI_API_KEY=your_actual_api_key_here
   ```
   - Replace `your_actual_api_key_here` with the API key you copied

4. **Restart the Application**
   ```bash
   npm run dev
   ```

## Verification

Once configured, the AI Insights Panel will:
- Show advanced AI-generated recommendations
- Provide personalized student insights
- Display predictive analytics
- Remove the "Gemini AI Configuration Required" message

## Troubleshooting

### 403 Error: "Method doesn't allow unregistered callers"
- **Cause**: Missing or invalid API key
- **Solution**: Verify your API key is correctly set in `.env.local`

### AI Insights Not Loading
- **Cause**: API key not found or application not restarted
- **Solution**: 
  1. Check `.env.local` file exists and contains `GEMINI_API_KEY`
  2. Restart the development server
  3. Clear browser cache if needed

### Fallback Mode
- When Gemini AI is unavailable, the system automatically uses:
  - Basic analytics-driven insights
  - Rule-based recommendations
  - Standard performance metrics

## Features Enabled with Gemini AI

### Class Insights
- AI-generated performance analysis
- Trend identification
- Intervention recommendations
- Risk assessment

### Personalized Recommendations
- Individual student analysis
- Immediate action items
- Short and long-term strategies
- Strength and risk factor identification

### Predictive Analytics
- Performance forecasting
- Risk student identification
- Intervention impact assessment
- Success probability calculations

## API Usage and Limits

- Gemini API has usage quotas
- Monitor your usage in Google AI Studio
- The application includes fallback mechanisms for quota exceeded scenarios
- Consider implementing caching for production use

## Security Notes

- Never commit API keys to version control
- Use environment variables only
- Consider using different keys for development and production
- Regularly rotate API keys for security
