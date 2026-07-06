import React from 'react'
import { Link } from 'react-router-dom'

export default function Landing() {
  return (
    <div className="page center-screen" style={{ flexDirection: 'column', gap: 16 }}>
      <div className="title" style={{ fontSize: 32 }}>GRIDNET AI</div>
      <div className="subtitle">Find and pay for internet, anywhere.</div>
      <Link to="/login" className="btn btn-primary" style={{ textAlign: 'center', textDecoration: 'none', display: 'block' }}>Log In</Link>
      <Link to="/signup" className="btn btn-secondary" style={{ textAlign: 'center', textDecoration: 'none', display: 'block' }}>Sign Up</Link>
    </div>
  )
}
