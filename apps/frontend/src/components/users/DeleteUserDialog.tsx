import * as React from "react";
import { toast } from "react-toastify";
import { deleteUser } from "../../services/userService";
import { Button } from "../ui/button";
import { Dialog } from "../ui/dialog";
import { Spinner } from "../ui/misc";

export interface DeleteUserDialogProps {
  callback: (id: string) => void;
}

export interface DeleteUserDialogRef {
  setUserId: (id: string) => void;
}

const DeleteUserDialog = React.forwardRef<
  DeleteUserDialogRef,
  DeleteUserDialogProps
>(({ callback }, ref) => {
  const [loading, setLoading] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [id, setId] = React.useState("");

  React.useImperativeHandle(ref, () => ({
    setUserId: (userId) => {
      setId(userId);
      setOpen(true);
    },
  }));

  const handleConfirm = async () => {
    try {
      setLoading(true);
      await deleteUser(id);
      callback(id);
      setOpen(false);
    } catch {
      toast.error("Failed to delete user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!loading) setOpen(next);
      }}
      title="Are you sure to remove this user?"
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={loading}
            onClick={() => void handleConfirm()}
          >
            {loading ? <Spinner className="h-4 w-4" /> : null}
            {loading ? "Deleting..." : "Delete"}
          </Button>
        </>
      }
    >
      <p className="text-sm text-muted-foreground">
        This action cannot be undone.
      </p>
    </Dialog>
  );
});

DeleteUserDialog.displayName = "DeleteUserDialog";

export default DeleteUserDialog;
