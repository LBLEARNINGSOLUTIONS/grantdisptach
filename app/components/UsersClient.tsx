"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
};

export default function UsersClient() {
  const [users, setUsers] = useState<User[]>([]);
  const [newUser, setNewUser] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  useEffect(() => {
    const load = async () => {
      const res = await fetch("/api/users");
      const data = await res.json();
      setUsers(data.users || []);
    };
    load();
  }, []);

  const createUser = async () => {
    setError(null);
    setLoading(true);
    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || "Failed to create user");
        return;
      }

      const data = await response.json();
      setUsers((prev) => [data.user, ...prev]);
      setNewUser({ name: "", email: "", password: "" });
    } catch (err) {
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (id: string, name: string) => {
    if (!window.confirm(`Delete user "${name}"? This cannot be undone.`)) {
      return;
    }

    setError(null);
    try {
      const response = await fetch(`/api/users/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || "Failed to delete user");
        return;
      }

      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (err) {
      setError("Network error. Please check your connection.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-[#1E3A5F] text-white px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold">Manage Users</h1>
            <p className="text-blue-200 text-sm">Create and manage dispatcher accounts</p>
          </div>
          <div className="flex gap-2">
            <a href="/manage" className="px-4 py-2 bg-[#3B5998] hover:bg-[#4a6aa8] rounded text-sm font-medium transition">
              Manage Settings
            </a>
            <a href="/" className="px-4 py-2 bg-[#3B5998] hover:bg-[#4a6aa8] rounded text-sm font-medium transition">
              Back to Checklist
            </a>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-sm font-medium transition text-white"
              title="Sign out of your account"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 space-y-6">
        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {/* Add New User Card */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="bg-gray-100 px-4 py-3 border-b border-gray-200">
            <h2 className="font-semibold text-gray-800">Add New User</h2>
          </div>
          <div className="p-4 space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                placeholder="John Smith"
                className="w-full px-3 py-2 rounded border border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                placeholder="john@example.com"
                className="w-full px-3 py-2 rounded border border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                placeholder="••••••••"
                className="w-full px-3 py-2 rounded border border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
              />
            </div>
            <button
              onClick={createUser}
              disabled={loading || !newUser.name || !newUser.email || !newUser.password}
              className="w-full px-4 py-2 rounded bg-[#1E3A5F] text-white font-medium hover:bg-[#2a4a73] transition text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Creating..." : "Add User"}
            </button>
          </div>
        </div>

        {/* Users List */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="bg-gray-100 px-4 py-3 border-b border-gray-200">
            <h2 className="font-semibold text-gray-800">Existing Users ({users.length})</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {users.map((user) => (
              <div key={user.id} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50">
                <div>
                  <p className="font-medium text-gray-900">{user.name}</p>
                  <p className="text-sm text-gray-500">{user.email}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {user.role} • Created {new Date(user.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => deleteUser(user.id, user.name)}
                  className="px-3 py-1.5 rounded border border-red-300 text-red-700 text-sm font-medium hover:bg-red-50 transition"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
