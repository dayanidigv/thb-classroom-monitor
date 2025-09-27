import React, { useState } from 'react'

const TestUsers = () => {
  const [users] = useState([
    { email: "dayanidigv954@gmail.com", passkey: "THB-TD-B1", name: "Dayanidi Vadivel", role: "super-admin" },
    { email: "bala@thehalfbrick.com", passkey: "THEHALFBRICK", name: "Balasubramanian Jayam", role: "super-admin" },
    { email: "thehalfbrickcontent@gmail.com", passkey: "THB-TD-B1-AI", name: "Gayathri", role: "admin" },
    { email: "partnerships.pratzleo@gmail.com", passkey: "THB-TD-B1-CT", name: "Prathiba", role: "admin" },
    { email: "hariprasath.thb@gmail.com", passkey: "THB-TD-B1-PD", name: "Hari", role: "admin" },
    { email: "anishaak06@gmail.com", passkey: "2006-05-02T18:30:00.000Z", name: "Anisha", role: "student" },
    { email: "engineerdatta1153@gmail.com", passkey: "2002-09-10T18:30:00.000Z", name: "Dattatreyav", role: "student" },
    { email: "balarhythamica@gmail.com", passkey: "2002-01-07T18:30:00.000Z", name: "Balarhythamica", role: "student" }
  ])

  const handleQuickLogin = (email: string, passkey: string) => {
    // Copy to clipboard for easy testing
    navigator.clipboard.writeText(`Email: ${email}\nPasskey: ${passkey}`)
    alert(`Copied to clipboard:\nEmail: ${email}\nPasskey: ${passkey}`)
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h3 className="text-lg font-semibold mb-4">Test Users Available</h3>
      <div className="grid gap-3">
        {users.map((user, index) => (
          <div 
            key={index} 
            className="p-3 border rounded cursor-pointer hover:bg-gray-50"
            onClick={() => handleQuickLogin(user.email, user.passkey)}
          >
            <div className="flex justify-between items-center">
              <div>
                <div className="font-medium">{user.name}</div>
                <div className="text-sm text-gray-600">{user.email}</div>
                <div className="text-xs text-blue-600">{user.role}</div>
              </div>
              <div className="text-xs text-gray-400">Click to copy login info</div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 text-xs text-gray-500">
        Click on any user to copy their login credentials to test the authentication system.
      </div>
    </div>
  )
}

export default TestUsers