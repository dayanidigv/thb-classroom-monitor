import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* The Half Brick Favicon */}
        <link rel="icon" href="/logo.png" />
        <link rel="shortcut icon" href="/logo.png" />
        <link rel="apple-touch-icon" href="/logo.png" />
        
        {/* Meta tags for The Half Brick */}
        <meta name="description" content="The Half Brick Talent Development Program - Classroom Monitor Dashboard" />
        <meta name="keywords" content="The Half Brick, talent development, classroom monitoring, education, skills development" />
        <meta name="author" content="The Half Brick Foundation" />
        
        {/* Open Graph / Social Media */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content="The Half Brick - Classroom Monitor" />
        <meta property="og:description" content="Talent Development Program Dashboard" />
        <meta property="og:image" content="/logo.png" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="The Half Brick - Classroom Monitor" />
        <meta name="twitter:description" content="Talent Development Program Dashboard" />
        <meta name="twitter:image" content="/logo.png" />
        
        {/* Theme color matching The Half Brick brand */}
        <meta name="theme-color" content="#CC3333" />
        <meta name="msapplication-TileColor" content="#CC3333" />
        
        {/* Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link 
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" 
          rel="stylesheet" 
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}