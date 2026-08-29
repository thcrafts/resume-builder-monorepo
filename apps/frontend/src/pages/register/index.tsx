import { yupResolver } from "@hookform/resolvers/yup";
import * as React from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { Link } from "react-router";
import * as yup from "yup";
import { toast } from "react-toastify";
import { register as registerUser } from "../../services/userService";
import { useAuth } from "../../components/common/AuthContext";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Card, CardContent } from "../../components/ui/card";
import { Alert } from "../../components/ui/misc";

const schema = yup
  .object({
    name: yup.string().required("Name is required"),
    email: yup.string().email("Valid email is required").required("Email is required"),
    password: yup
      .string()
      .min(6, "Password must be at least 6 characters")
      .required("Password is required"),
    confirmPassword: yup
      .string()
      .oneOf([yup.ref("password")], "Passwords must match")
      .required("Please confirm your password"),
  })
  .required();

const Register: React.FC = () => {
  const authContext = useAuth();
  const [error, setError] = React.useState<string | null>(null);
  const { formState, register, handleSubmit } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit: SubmitHandler<yup.InferType<typeof schema>> = async (data) => {
    try {
      setError(null);
      const { access_token } = await registerUser({
        name: data.name,
        email: data.email,
        password: data.password,
      });
      authContext.login(access_token);
      toast.success("Account created successfully");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Failed to create account";
      setError(message);
      toast.error(message);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardContent className="space-y-6 p-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Resume Builder</h1>
          <p className="mt-1 text-sm text-muted-foreground">Create your account</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {(
            [
              ["name", "Full Name", "text"],
              ["email", "Email", "email"],
              ["password", "Password", "password"],
              ["confirmPassword", "Confirm Password", "password"],
            ] as const
          ).map(([field, label, type]) => (
            <div key={field} className="space-y-2">
              <Label htmlFor={field}>{label}</Label>
              <Input id={field} type={type} {...register(field)} />
              {formState.errors[field] ? (
                <p className="text-xs text-destructive">
                  {formState.errors[field]?.message}
                </p>
              ) : null}
            </div>
          ))}

          {error ? <Alert variant="destructive">{error}</Alert> : null}

          <Button type="submit" className="w-full" size="lg">
            Create account
          </Button>
        </form>

        <p className="text-center text-sm">
          Already have an account?{" "}
          <Link to="/login" className="text-primary underline-offset-4 hover:underline">
            Log in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
};

export default Register;
