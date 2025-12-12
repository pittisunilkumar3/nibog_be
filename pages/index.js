export default function Home() {
  return (
    <div style={{ padding: '50px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Next.js Backend API</h1>
      <p>Server is running on port 3004</p>
      <p>
        <a href="/api/hello" target="_blank" rel="noopener noreferrer">
          Test API: /api/hello
        </a>
      </p>
    </div>
  )
}
