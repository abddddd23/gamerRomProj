import { FormEvent, useEffect, useState } from "react";
import { Monitor, Save, SquarePlus } from "lucide-react";

import { api, getApiError } from "../api/client";
import { Post, PostStatus } from "../api/types";
import { DataTable } from "../components/DataTable";
import { EmptyState } from "../components/EmptyState";
import { StatusBadge } from "../components/StatusBadge";

const statuses: PostStatus[] = ["free", "playing", "paused", "maintenance"];

export function PostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [form, setForm] = useState({ name: "", camera_url: "" });
  const [edits, setEdits] = useState<Record<number, Partial<Post>>>({});
  const [error, setError] = useState("");

  async function loadPosts() {
    const { data } = await api.get<Post[]>("/posts");
    setPosts(data);
  }

  useEffect(() => {
    loadPosts().catch((err) => setError(getApiError(err)));
  }, []);

  async function createPost(event: FormEvent) {
    event.preventDefault();
    try {
      await api.post("/posts", { name: form.name, camera_url: form.camera_url || null, status: "free" });
      setForm({ name: "", camera_url: "" });
      await loadPosts();
      setError("");
    } catch (err) {
      setError(getApiError(err));
    }
  }

  async function savePost(post: Post) {
    const update = edits[post.id] ?? {};
    try {
      await api.patch(`/posts/${post.id}`, {
        name: update.name ?? post.name,
        camera_url: update.camera_url === undefined ? post.camera_url : update.camera_url || null,
        status: update.status ?? post.status,
      });
      await loadPosts();
      setError("");
    } catch (err) {
      setError(getApiError(err));
    }
  }

  function updateEdit(postId: number, update: Partial<Post>) {
    setEdits((current) => ({ ...current, [postId]: { ...current[postId], ...update } }));
  }

  return (
    <section className="page">
      <div className="page-heading">
        <div>
          <h1>Posts</h1>
          <p>Manage consoles, TVs, camera URLs, and station status.</p>
        </div>
      </div>
      {error && <div className="error-banner">{error}</div>}
      <form className="toolbar-form form-card" onSubmit={createPost}>
        <label>
          Post name
          <input placeholder="Post name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        </label>
        <label>
          Camera URL
          <input
            placeholder="Camera URL"
            value={form.camera_url}
            onChange={(event) => setForm({ ...form, camera_url: event.target.value })}
          />
        </label>
        <button className="primary-button">
          <SquarePlus size={17} />
          Add post
        </button>
      </form>

      <DataTable
        empty={posts.length === 0}
        emptyState={<EmptyState title="No posts yet" description="Add the first gaming station to begin." icon={Monitor} />}
      >
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Camera URL</th>
              <th>Status</th>
              <th>Current</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {posts.map((post) => (
              <tr key={post.id}>
                <td>
                  <input value={edits[post.id]?.name ?? post.name} onChange={(event) => updateEdit(post.id, { name: event.target.value })} />
                </td>
                <td>
                  <input
                    value={edits[post.id]?.camera_url ?? post.camera_url ?? ""}
                    onChange={(event) => updateEdit(post.id, { camera_url: event.target.value })}
                  />
                </td>
                <td>
                  <select
                    value={edits[post.id]?.status ?? post.status}
                    onChange={(event) => updateEdit(post.id, { status: event.target.value as PostStatus })}
                  >
                    {statuses.map((status) => (
                      <option value={status} key={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <StatusBadge value={post.status} />
                </td>
                <td>
                  <button className="secondary-button" onClick={() => savePost(post)}>
                    <Save size={16} />
                    Save
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </DataTable>
    </section>
  );
}
