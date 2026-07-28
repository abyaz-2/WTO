"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { fetchUsers, createUser, updateUser, resetUserPassword, deleteUser } from "@/lib/api";
import Skeleton from "@/components/Skeleton";
import EmptyState from "@/components/EmptyState";
import Modal from "@/components/Modal";
import { motion } from "framer-motion";
import type { User } from "@/lib/types";

type UserRole = "executive_board" | "delegate";

function RoleBadge({ role }: { role: string }) {
  const colors: Record<string, string> = {
    executive_board: "bg-purple-500/10 text-purple-400 border border-purple-500/20",
    delegate: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
  };

  return (
    <span
      className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full ${
        colors[role] ?? "bg-[rgba(255,255,255,0.06)] text-[#B6C3D1]"
      }`}
    >
      {role === "executive_board" ? "Executive Board" : "Delegate"}
    </span>
  );
}

interface AddUserFormData {
  email: string;
  country: string;
  password: string;
}

type CreatedUserResult = {
  user: User;
};

function RemoveUserButton({ userId, disabled }: { userId: string; disabled?: boolean }) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const handleRemove = () => {
    setError(null);
    const confirmed = window.confirm("Remove this user? This will revoke their access.");
    if (!confirmed) return;
    mutation.mutate(userId);
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleRemove}
        disabled={disabled || mutation.isPending}
        className="px-3 py-1.5 text-xs font-medium text-red-300 bg-red-500/10 border border-red-500/20 rounded-[8px] hover:bg-red-500/15 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {mutation.isPending ? "Removing..." : "Remove"}
      </button>
      {error && <span className="text-[11px] text-red-400 max-w-[10rem] text-right">{error}</span>}
    </div>
  );
}

function ReactivateButton({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (id: string) => updateUser(id, { isActive: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const handleReactivate = () => {
    setError(null);
    mutation.mutate(userId);
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleReactivate}
        disabled={mutation.isPending}
        className="px-3 py-1.5 text-xs font-medium text-green-300 bg-green-500/10 border border-green-500/20 rounded-[8px] hover:bg-green-500/15 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {mutation.isPending ? "Reactivating..." : "Reactivate"}
      </button>
      {error && <span className="text-[11px] text-red-400 max-w-[10rem] text-right">{error}</span>}
    </div>
  );
}

function ResetPasswordSection({ userId }: { userId: string }) {
  const [show, setShow] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (pw: string) => resetUserPassword(userId, pw),
    onSuccess: () => {
      setSuccess(true);
      setPassword("");
      setTimeout(() => { setShow(false); setSuccess(false); }, 1500);
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  if (!show) {
    return (
      <button
        type="button"
        onClick={() => { setShow(true); setError(null); }}
        className="text-xs font-medium text-[#6CA9FF] hover:text-white transition-colors"
      >
        Reset password
      </button>
    );
  }

  const handleSubmit = () => {
    setError(null);
    setSuccess(false);
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
    mutation.mutate(password);
  };

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-[#B6C3D1] uppercase tracking-wider">Reset Password</p>
      {success ? (
        <p className="text-xs text-green-400">Password updated successfully.</p>
      ) : (
        <div className="flex items-center gap-2">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="New password (min. 8 chars)"
            className="flex-1 px-3 py-2 text-sm bg-[#112F5A] border border-[rgba(255,255,255,0.08)] text-white placeholder-[#7D8DA0] rounded-[8px] focus:outline-none focus:border-[rgba(30,111,232,0.5)] focus:ring-1 focus:ring-[rgba(30,111,232,0.3)] transition-all"
          />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={mutation.isPending}
            className="px-4 py-2 text-xs font-medium text-white bg-[#1E6FE8] hover:bg-[#1A5FC8] disabled:opacity-50 rounded-[8px] transition-colors"
          >
            {mutation.isPending ? "..." : "Set"}
          </button>
          <button
            type="button"
            onClick={() => setShow(false)}
            className="px-2 py-2 text-xs text-[#B6C3D1] hover:text-white transition-colors"
          >
            Cancel
          </button>
        </div>
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

function EditUserModal({ open, onClose, user }: { open: boolean; onClose: () => void; user: User }) {
  const queryClient = useQueryClient();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<{
    displayName: string;
    country: string;
    role: UserRole;
  }>({
    defaultValues: {
      displayName: user.display_name,
      country: user.country ?? "",
      role: user.role as UserRole,
    },
  });

  const mutation = useMutation({
    mutationFn: (data: { displayName: string; country: string; role: UserRole }) =>
      updateUser(user.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      onClose();
    },
    onError: (err: Error) => {
      setSubmitError(err.message);
    },
  });

  const onSubmit = (data: { displayName: string; country: string; role: UserRole }) => {
    setSubmitError(null);
    mutation.mutate(data);
  };

  return (
    <Modal open={open} onClose={onClose} title={`Edit User — ${user.email}`}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <label htmlFor="edit-displayName" className="block text-sm font-medium text-white mb-1.5">
            Display Name
          </label>
          <input
            id="edit-displayName"
            type="text"
            {...register("displayName", {
              required: "Display name is required",
              minLength: { value: 1, message: "Display name is required" },
            })}
            className="w-full px-4 py-2.5 text-sm bg-[#112F5A] border border-[rgba(255,255,255,0.08)] text-white placeholder-[#7D8DA0] rounded-[8px] focus:outline-none focus:border-[rgba(30,111,232,0.5)] focus:ring-1 focus:ring-[rgba(30,111,232,0.3)] transition-all"
          />
          {errors.displayName && (
            <p className="text-xs text-red-400 mt-1">{errors.displayName.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="edit-country" className="block text-sm font-medium text-white mb-1.5">
            Country
          </label>
          <input
            id="edit-country"
            type="text"
            placeholder="Kenya"
            {...register("country")}
            className="w-full px-4 py-2.5 text-sm bg-[#112F5A] border border-[rgba(255,255,255,0.08)] text-white placeholder-[#7D8DA0] rounded-[8px] focus:outline-none focus:border-[rgba(30,111,232,0.5)] focus:ring-1 focus:ring-[rgba(30,111,232,0.3)] transition-all"
          />
        </div>

        <div>
          <label htmlFor="edit-role" className="block text-sm font-medium text-white mb-1.5">
            Role
          </label>
          <select
            id="edit-role"
            {...register("role", { required: "Role is required" })}
            className="w-full px-4 py-2.5 text-sm bg-[#112F5A] border border-[rgba(255,255,255,0.08)] text-white rounded-[8px] focus:outline-none focus:border-[rgba(30,111,232,0.5)] focus:ring-1 focus:ring-[rgba(30,111,232,0.3)] transition-all"
          >
            <option value="delegate">Delegate</option>
            <option value="executive_board">Executive Board</option>
          </select>
          {errors.role && (
            <p className="text-xs text-red-400 mt-1">{errors.role.message}</p>
          )}
        </div>

        <div className="border-t border-[rgba(255,255,255,0.06)] pt-5">
          <ResetPasswordSection userId={user.id} />
        </div>

        {submitError && (
          <div className="p-3 rounded-[8px] bg-red-500/10 border border-red-500/20">
            <p className="text-sm text-red-400">{submitError}</p>
          </div>
        )}

        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={mutation.isPending || !isDirty}
            className="px-6 py-2.5 text-sm font-medium text-white bg-[#1E6FE8] hover:bg-[#1A5FC8] disabled:opacity-50 disabled:cursor-not-allowed rounded-[8px] transition-colors"
          >
            {mutation.isPending ? "Saving..." : "Save Changes"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-medium text-[#B6C3D1] hover:text-white transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}

function AddUserModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdUser, setCreatedUser] = useState<CreatedUserResult | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddUserFormData>({
  });

  const mutation = useMutation({
    mutationFn: createUser,
    onSuccess: (result: CreatedUserResult) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      reset();
      setCreatedUser(result);
    },
    onError: (err: Error) => {
      setSubmitError(err.message);
    },
  });

  const onSubmit = (data: AddUserFormData) => {
    setSubmitError(null);
    mutation.mutate(data);
  };

  const handleClose = () => {
    setCreatedUser(null);
    setSubmitError(null);
    reset();
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="Admin Access">
      {createdUser ? (
        <div className="space-y-4">
          <div className="rounded-[10px] border border-green-500/20 bg-green-500/10 p-4">
            <p className="text-sm font-medium text-green-300">User created</p>
            <p className="text-xs text-[#B6C3D1] mt-1">
              The account was created in Supabase Auth and is ready to use.
            </p>
          </div>

          <div className="space-y-3 text-sm">
            <div>
              <p className="text-xs uppercase tracking-wider text-[#7D8DA0] mb-1">Email</p>
              <p className="text-white">{createdUser.user.email}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-[#7D8DA0] mb-1">Country</p>
              <p className="text-white">{createdUser.user.country ?? "-"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-[#7D8DA0] mb-1">Status</p>
              <p className="text-white">Password set by admin</p>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={handleClose}
              className="px-6 py-2.5 text-sm font-medium text-white bg-[#1E6FE8] hover:bg-[#1A5FC8] rounded-[8px] transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      ) : (
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-white mb-1.5">
            Email
          </label>
          <input
            id="email"
            type="email"
            placeholder="user@example.com"
            {...register("email", {
              required: "Email is required",
              pattern: { value: /^\S+@\S+$/i, message: "Invalid email address" },
            })}
            className="w-full px-4 py-2.5 text-sm bg-[#112F5A] border border-[rgba(255,255,255,0.08)] text-white placeholder-[#7D8DA0] rounded-[8px] focus:outline-none focus:border-[rgba(30,111,232,0.5)] focus:ring-1 focus:ring-[rgba(30,111,232,0.3)] transition-all"
          />
          {errors.email && (
            <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="country" className="block text-sm font-medium text-white mb-1.5">
            Country
          </label>
          <input
            id="country"
            type="text"
            placeholder="Kenya"
            {...register("country", {
              required: "Country is required",
              minLength: { value: 2, message: "Country is required" },
              maxLength: { value: 255, message: "Country too long" },
            })}
            className="w-full px-4 py-2.5 text-sm bg-[#112F5A] border border-[rgba(255,255,255,0.08)] text-white placeholder-[#7D8DA0] rounded-[8px] focus:outline-none focus:border-[rgba(30,111,232,0.5)] focus:ring-1 focus:ring-[rgba(30,111,232,0.3)] transition-all"
          />
          {errors.country && (
            <p className="text-xs text-red-400 mt-1">{errors.country.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-white mb-1.5">
            Password
          </label>
          <input
            id="password"
            type="password"
            placeholder="Enter a password for this user"
            {...register("password", {
              required: "Password is required",
              minLength: { value: 8, message: "Password must be at least 8 characters" },
            })}
            className="w-full px-4 py-2.5 text-sm bg-[#112F5A] border border-[rgba(255,255,255,0.08)] text-white placeholder-[#7D8DA0] rounded-[8px] focus:outline-none focus:border-[rgba(30,111,232,0.5)] focus:ring-1 focus:ring-[rgba(30,111,232,0.3)] transition-all"
          />
          {errors.password && (
            <p className="text-xs text-red-400 mt-1">{errors.password.message}</p>
          )}
        </div>

        {submitError && (
          <div className="p-3 rounded-[8px] bg-red-500/10 border border-red-500/20">
            <p className="text-sm text-red-400">{submitError}</p>
          </div>
        )}

        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="px-6 py-2.5 text-sm font-medium text-white bg-[#1E6FE8] hover:bg-[#1A5FC8] disabled:opacity-50 disabled:cursor-not-allowed rounded-[8px] transition-colors"
          >
            {mutation.isPending ? "Adding..." : "Add User"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-medium text-[#B6C3D1] hover:text-white transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
      )}
    </Modal>
  );
}

export default function UserDirectory() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const { data: users, isLoading, isError } = useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 rounded-[8px] border border-[rgba(255,255,255,0.08)]">
            <Skeleton variant="avatar" />
            <div className="flex-1 space-y-2">
              <Skeleton variant="text" className="w-1/4" />
              <Skeleton variant="text" className="w-1/3" />
            </div>
            <Skeleton variant="text" className="w-24" />
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-red-400">Failed to load users.</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-end mb-6">
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2 text-sm font-medium text-white bg-[#1E6FE8] hover:bg-[#1A5FC8] rounded-[8px] transition-colors ml-auto"
        >
          Add User
        </button>
      </div>

      {(!users || users.length === 0) ? (
        <EmptyState
          title="No users found"
          description="There are no registered users yet."
        />
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="border border-[rgba(255,255,255,0.08)] rounded-[12px] overflow-hidden"
        >
          <table className="w-full">
            <thead>
              <tr className="border-b border-[rgba(255,255,255,0.06)]">
                <th className="text-left px-5 py-3 text-xs font-semibold tracking-wider uppercase text-[#7D8DA0]">User</th>
                <th className="text-left px-5 py-3 text-xs font-semibold tracking-wider uppercase text-[#7D8DA0]">Email</th>
                <th className="text-left px-5 py-3 text-xs font-semibold tracking-wider uppercase text-[#7D8DA0]">Country</th>
                <th className="text-left px-5 py-3 text-xs font-semibold tracking-wider uppercase text-[#7D8DA0]">Role</th>
                <th className="text-left px-5 py-3 text-xs font-semibold tracking-wider uppercase text-[#7D8DA0]">Status</th>
                <th className="text-left px-5 py-3 text-xs font-semibold tracking-wider uppercase text-[#7D8DA0]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(255,255,255,0.06)]">
              {users.map((user: User, index: number) => (
                <motion.tr
                  key={user.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="hover:bg-[rgba(255,255,255,0.02)] transition-colors"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.1)] flex items-center justify-center text-xs font-medium text-[#B6C3D1]">
                        {user.display_name
                          ?.split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2) ?? "??"}
                      </div>
                      <span className="text-sm font-medium text-white">{user.display_name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-[#B6C3D1]">{user.email}</td>
                  <td className="px-5 py-4 text-sm text-[#B6C3D1]">{user.country ?? "-"}</td>
                  <td className="px-5 py-4">
                    <RoleBadge role={user.role} />
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full ${
                        user.is_active
                          ? "bg-green-500/10 text-green-400 border border-green-500/20"
                          : "bg-red-500/10 text-red-400 border border-red-500/20"
                      }`}
                    >
                      {user.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setEditingUser(user)}
                        className="px-3 py-1.5 text-xs font-medium text-[#B6C3D1] bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.08)] rounded-[8px] hover:bg-[rgba(255,255,255,0.1)] transition-colors"
                      >
                        Edit
                      </button>
                      {user.is_active ? (
                        <RemoveUserButton userId={user.id} disabled={user.role === "executive_board"} />
                      ) : (
                        <ReactivateButton userId={user.id} />
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      )}

      <AddUserModal
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />

      {editingUser && (
        <EditUserModal
          open={!!editingUser}
          onClose={() => setEditingUser(null)}
          user={editingUser}
        />
      )}
    </>
  );
}