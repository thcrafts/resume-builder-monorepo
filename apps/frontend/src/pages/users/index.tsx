import * as React from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "react-toastify";

import UpsertUserDialog, {
  type UpsertUserDialogRef,
} from "../../components/users/UpsertUserDialog";
import { getUsers, type UserResponse } from "../../services/userService";
import DeleteUserDialog, {
  type DeleteUserDialogRef,
} from "../../components/users/DeleteUserDialog";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { Badge } from "../../components/ui/misc";
import { cn } from "../../lib/utils";

const Users: React.FC = () => {
  const [upsertDlgOpen, setUpsertDlgOpen] = React.useState(false);
  const [users, setUsers] = React.useState<Array<UserResponse>>([]);
  const upsertUserDialogRef = React.useRef<UpsertUserDialogRef>(null);
  const deleteUserDialogRef = React.useRef<DeleteUserDialogRef>(null);
  const [popover, setPopover] = React.useState<{
    title: string;
    content: string;
    top: number;
    left: number;
  } | null>(null);

  React.useEffect(() => {
    getUsers()
      .then((data) => setUsers(data))
      .catch((error) => {
        toast.error("Failed to load users");
        console.error(error);
      });
  }, []);

  React.useEffect(() => {
    if (!popover) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPopover(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [popover]);

  const openPopover = (
    event: React.MouseEvent<HTMLElement>,
    title: string,
    content: string,
  ) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setPopover({
      title,
      content,
      top: rect.bottom + 8,
      left: Math.min(rect.left, window.innerWidth - 320),
    });
  };

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <Button
          type="button"
          onClick={() => {
            setUpsertDlgOpen(true);
            upsertUserDialogRef.current?.setUser();
          }}
        >
          <Plus className="h-4 w-4" />
          Add New User
        </Button>
      </div>

      <Card>
        <Table aria-label="users table">
          <TableHeader>
            <TableRow>
              <TableHead className="text-center">Name</TableHead>
              <TableHead className="text-center">Email</TableHead>
              <TableHead className="text-center">Role</TableHead>
              <TableHead className="text-center">Template</TableHead>
              <TableHead className="text-center">Instructions</TableHead>
              <TableHead className="text-center">Questions Prompt</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user._id}>
                <TableCell className="text-center">{user.name}</TableCell>
                <TableCell className="text-center">{user.email}</TableCell>
                <TableCell className="text-center">
                  <Badge
                    variant={user.role === "admin" ? "default" : "secondary"}
                  >
                    {user.role}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="secondary">
                    {user.template || "template1"}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  {user.instructions ? (
                    <button
                      type="button"
                      className="cursor-pointer"
                      onClick={(e) =>
                        openPopover(
                          e,
                          "Instructions",
                          user.instructions || "",
                        )
                      }
                    >
                      <Badge variant="outline" className="max-w-[200px] truncate">
                        {user.instructions.length > 30
                          ? `${user.instructions.substring(0, 30)}...`
                          : user.instructions}
                      </Badge>
                    </button>
                  ) : (
                    <Badge variant="outline">None</Badge>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {user.questionsPrompt ? (
                    <button
                      type="button"
                      className="cursor-pointer"
                      onClick={(e) =>
                        openPopover(
                          e,
                          "Questions Prompt",
                          user.questionsPrompt || "",
                        )
                      }
                    >
                      <Badge
                        variant="outline"
                        className={cn(
                          "max-w-[200px] truncate border-success/40 text-success",
                        )}
                      >
                        {user.questionsPrompt.length > 30
                          ? `${user.questionsPrompt.substring(0, 30)}...`
                          : user.questionsPrompt}
                      </Badge>
                    </button>
                  ) : (
                    <Badge variant="outline">Default</Badge>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        setUpsertDlgOpen(true);
                        upsertUserDialogRef.current?.setUser(user);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => {
                        deleteUserDialogRef.current?.setUserId(user._id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {popover ? (
        <>
          <button
            type="button"
            aria-label="Close popover"
            className="fixed inset-0 z-40"
            onClick={() => setPopover(null)}
          />
          <div
            className="fixed z-50 max-h-96 max-w-md overflow-auto rounded-lg border border-border bg-card p-4 shadow-lg"
            style={{ top: popover.top, left: popover.left }}
          >
            <p className="mb-2 text-sm font-semibold">{popover.title}:</p>
            <p className="whitespace-pre-wrap break-words text-sm">
              {popover.content}
            </p>
          </div>
        </>
      ) : null}

      <UpsertUserDialog
        ref={upsertUserDialogRef}
        open={upsertDlgOpen}
        handleClose={() => {
          setUpsertDlgOpen(false);
        }}
        callback={(user, mode) => {
          if (mode === "Create") {
            setUsers((value) => [user, ...value]);
            toast.success(`User "${user.name}" created successfully`);
          } else {
            setUsers((prev) => {
              const index = prev.findIndex((item) => item._id === user._id);
              if (index === -1) return prev;
              return [
                ...prev.slice(0, index),
                user,
                ...prev.slice(index + 1),
              ];
            });
            toast.success(`User "${user.name}" updated successfully`);
          }
        }}
      />
      <DeleteUserDialog
        ref={deleteUserDialogRef}
        callback={(userId) => {
          const deletedUser = users.find((u) => u._id === userId);
          setUsers((prev) => {
            const index = prev.findIndex((item) => item._id === userId);
            if (index === -1) return prev;
            return [...prev.slice(0, index), ...prev.slice(index + 1)];
          });
          if (deletedUser) {
            toast.success(`User "${deletedUser.name}" deleted successfully`);
          }
        }}
      />
    </div>
  );
};

export default Users;
