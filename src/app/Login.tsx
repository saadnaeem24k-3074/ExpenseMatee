import { useState, type FormEvent } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Wallet, Loader2 } from "lucide-react"
import { useAuth, ApiError } from "@/lib/useAuth"
import { toast } from "sonner"

const Login = () => {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await login(email, password)
      navigate("/")
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Something went wrong. Try again."
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="my-poppins flex min-h-screen items-center justify-center auth-bg px-4">
      <Card className="w-full max-w-md rounded-2xl border-0 shadow-2xl">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-ink">
            <Wallet className="h-6 w-6 text-white" />
          </div>
          <CardTitle className="my-display text-2xl font-semibold text-ink">Welcome back</CardTitle>
          <p className="text-sm text-muted-foreground">Log in to track your expenses</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </Field>
              <Button
                type="submit"
                disabled={submitting}
                className="mt-2 cursor-pointer bg-ink py-5 hover:bg-ink/90"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Log in"}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Link to="/signup" className="font-medium text-ink underline underline-offset-4">
                  Sign up
                </Link>
              </p>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default Login
