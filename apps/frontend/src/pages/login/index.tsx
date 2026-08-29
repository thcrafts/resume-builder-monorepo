import { yupResolver } from "@hookform/resolvers/yup";
import * as React from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { Link } from "react-router";
import * as yup from "yup";
import { toast } from "react-toastify";
import userService from "../../services/userService";
import { useAuth } from "../../components/common/AuthContext";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Card, CardContent } from "../../components/ui/card";
import { Alert } from "../../components/ui/misc";

const schema = yup
  .object({
    email: yup.string().email("Valid email is required").required("Email is required"),
    password: yup.string().required("Password is required"),
  })
  .required();

const Login: React.FC = () => {
  const authContext = useAuth();
  const [error, setError] = React.useState<string | null>(null);
  const { formState, register, handleSubmit } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit: SubmitHandler<yup.InferType<typeof schema>> = async (data) => {
    try {
      setError(null);
      const { access_token } = await userService.login(data.email, data.password);
      authContext.login(access_token);
      toast.success("Logged in successfully");
    } catch {
      setError("Invalid email or password");
      toast.error("Failed to log in");
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardContent className="space-y-6 p-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Resume Builder</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register("email")} />
            {formState.errors.email ? (
              <p className="text-xs text-destructive">{formState.errors.email.message}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" {...register("password")} />
            {formState.errors.password ? (
              <p className="text-xs text-destructive">{formState.errors.password.message}</p>
            ) : null}
          </div>

          {error ? <Alert variant="destructive">{error}</Alert> : null}

          <Button type="submit" className="w-full" size="lg">
            Log in
          </Button>
        </form>

        <p className="text-center text-sm">
          Don&apos;t have an account?{" "}
          <Link to="/register" className="text-primary underline-offset-4 hover:underline">
            Create one
          </Link>
        </p>
      </CardContent>
    </Card>
  );
};

export default Login;
