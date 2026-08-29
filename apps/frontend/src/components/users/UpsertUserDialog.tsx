import * as React from "react";
import { Controller, useForm, type SubmitHandler } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { toast } from "react-toastify";
import {
  createUser,
  updateUser,
  type UserResponse,
  type CreateUserDto,
  type UpdateUserDto,
} from "../../services/userService";
import { Button } from "../ui/button";
import { Dialog } from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Select } from "../ui/misc";

const schema = yup
  .object({
    id: yup.string(),
    email: yup.string().email().required(),
    name: yup.string().required(),
    password: yup.string().when("id", {
      is: (id: string) => !id,
      then: (s) => s.required(),
      otherwise: (s) => s.notRequired(),
    }),
    role: yup.string().oneOf(["user", "admin"]).required(),
    template: yup
      .string()
      .oneOf([
        "template1",
        "template2",
        "template3",
        "template4",
        "template5",
        "template6",
        "template7",
      ])
      .required(),
    instructions: yup.string().notRequired(),
    questionsPrompt: yup.string().notRequired(),
  })
  .required();

export interface UpsertUserDialogProps {
  open: boolean;
  user?: UserResponse;
  handleClose: () => void;
  callback: (user: UserResponse, mode: "Create" | "Update") => void;
}

export interface UpsertUserDialogRef {
  setUser: (user?: UserResponse) => void;
}

const UpsertUserDialog = React.forwardRef<
  UpsertUserDialogRef,
  UpsertUserDialogProps
>(({ open, handleClose, callback }, ref) => {
  const { formState, control, register, handleSubmit, reset, watch } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      id: undefined,
      email: "",
      name: "",
      password: "",
      role: "user" as "user" | "admin",
      template: "template1",
      instructions: "",
      questionsPrompt: "",
    },
  });

  const onSubmit: SubmitHandler<yup.InferType<typeof schema>> = async (
    data,
  ) => {
    try {
      if (data.id) {
        const updateData: UpdateUserDto = {
          email: data.email,
          name: data.name,
          role: data.role,
          template: data.template,
          instructions: data.instructions || undefined,
          questionsPrompt: data.questionsPrompt || undefined,
        };
        if (data.password) updateData.password = data.password;
        const res = await updateUser(data.id, updateData);
        callback(res, "Update");
      } else {
        const createData: CreateUserDto = {
          email: data.email,
          name: data.name,
          password: data.password!,
          role: data.role,
          template: data.template,
          instructions: data.instructions || undefined,
          questionsPrompt: data.questionsPrompt || undefined,
        };
        const res = await createUser(createData);
        callback(res, "Create");
      }
      handleClose();
    } catch {
      toast.error(`Failed to ${data.id ? "update" : "create"} user`);
    }
  };

  React.useImperativeHandle(ref, () => ({
    setUser: (user) => {
      if (user) {
        reset({
          id: user._id,
          email: user.email,
          name: user.name,
          password: "",
          role: user.role,
          template: user.template || "template1",
          instructions: user.instructions || "",
          questionsPrompt: user.questionsPrompt || "",
        });
      } else {
        reset({
          id: "",
          email: "",
          name: "",
          password: "",
          role: "user",
          template: "template1",
          instructions: "",
          questionsPrompt: "",
        });
      }
    },
  }));

  const userId = watch("id");
  const isEditMode = !!userId;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) handleClose();
      }}
      title={isEditMode ? "Edit User" : "Create User"}
      className="max-w-lg"
      footer={
        <>
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" form="upsert-user-form">
            {isEditMode ? "Update" : "Create"}
          </Button>
        </>
      }
    >
      <form
        id="upsert-user-form"
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-4"
      >
        <input type="hidden" {...register("id")} />

        <div className="space-y-1.5">
          <Label htmlFor="user-email">Email</Label>
          <Input id="user-email" type="email" {...register("email")} />
          {formState.errors.email ? (
            <p className="text-xs text-destructive">
              {formState.errors.email.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="user-name">Name</Label>
          <Input id="user-name" {...register("name")} />
          {formState.errors.name ? (
            <p className="text-xs text-destructive">
              {formState.errors.name.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="user-password">Password</Label>
          <Input id="user-password" type="password" {...register("password")} />
          {formState.errors.password ? (
            <p className="text-xs text-destructive">
              {formState.errors.password.message}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              {isEditMode ? "Leave blank to keep current password" : ""}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="user-role">Role</Label>
          <Controller
            name="role"
            control={control}
            render={({ field }) => (
              <Select id="user-role" {...field}>
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </Select>
            )}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="user-template">Template</Label>
          <Controller
            name="template"
            control={control}
            render={({ field }) => (
              <Select id="user-template" {...field}>
                <option value="template1">Template 1</option>
                <option value="template2">Template 2</option>
                <option value="template3">Template 3</option>
                <option value="template4">Template 4</option>
                <option value="template5">Template 5</option>
                <option value="template6">Template 6</option>
                <option value="template7">Template 7</option>
              </Select>
            )}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="user-instructions">Instructions</Label>
          <Textarea
            id="user-instructions"
            rows={6}
            placeholder="Enter custom instructions for resume generation (optional)"
            {...register("instructions")}
          />
          <p className="text-xs text-muted-foreground">
            These instructions will be appended to the default resume generation
            prompt for this user
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="user-questions-prompt">Questions Prompt</Label>
          <Textarea
            id="user-questions-prompt"
            rows={8}
            placeholder="Enter custom prompt for answering job application questions (optional)"
            {...register("questionsPrompt")}
          />
          <p className="text-xs text-muted-foreground">
            This prompt will override the default questions answering prompt for
            this user
          </p>
        </div>
      </form>
    </Dialog>
  );
});

UpsertUserDialog.displayName = "UpsertUserDialog";

export default UpsertUserDialog;
