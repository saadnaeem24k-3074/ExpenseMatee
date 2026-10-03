import Dashboard from "./app/Dashboard"
import { BrowserRouter } from "react-router-dom"
import { Routes, Route } from "react-router-dom"
import Transactions from "./app/Transactions"
import Report from "./app/Report"
import AddTransaction from "./app/AddTransaction"
import Budget from "./app/Budget"
import Settings from "./app/Settings"
import Login from "./app/Login"
import Signup from "./app/Signup"
import ProtectedRoute from "./app/ProtectedRoute"
import { AuthProvider } from "./lib/AuthContext"
import { Toaster } from "@/components/ui/sonner"

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/transactions" element={<ProtectedRoute><Transactions /></ProtectedRoute>} />
          <Route path="/report" element={<ProtectedRoute><Report /></ProtectedRoute>} />
          <Route path="/addtransaction" element={<ProtectedRoute><AddTransaction /></ProtectedRoute>} />
          <Route path="/budget" element={<ProtectedRoute><Budget /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        </Routes>
        <Toaster position="top-center" offset={20} richColors
          toastOptions={{
            style: {
              marginTop: '60px',
            },
            className: 'my-custom-toast'
          }} />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
