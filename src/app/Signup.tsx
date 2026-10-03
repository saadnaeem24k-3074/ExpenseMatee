import { useState, type FormEvent } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldLabel, FieldGroup, FieldDescription } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Wallet, Loader2 } from "lucide-react"
import { useAuth, ApiError } from "@/lib/useAuth"
import { toast } from "sonner"

const Signup = () => {
  const { signup } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await signup(name, email, password)
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
          <CardTitle className="my-display text-2xl font-semibold text-ink">Create your account</CardTitle>
          <p className="text-sm text-muted-foreground">Start tracking your income and expenses</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="name">Name</FieldLabel>
                <Input
                  id="name"
                  autoComplete="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Saad Naeem"
                />
              </Field>
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
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
                <FieldDescription>At least 8 characters.</FieldDescription>
              </Field>
              <Button
                type="submit"
                disabled={submitting}
                className="mt-2 cursor-pointer bg-ink py-5 hover:bg-ink/90"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign up"}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link to="/login" className="font-medium text-ink underline underline-offset-4">
                  Log in
                </Link>
              </p>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default Signup
