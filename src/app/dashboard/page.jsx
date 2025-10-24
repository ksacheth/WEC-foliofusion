"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function DashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("profile");
  const [itemForms, setItemForms] = useState({});

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/auth/login");
      return;
    }

    fetchData(token);
  }, [router]);

  const fetchData = async (token) => {
    try {
      const [profileRes, sectionsRes] = await Promise.all([
        fetch("/api/profile/get", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/sections/list", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const profileData = await profileRes.json();
      const sectionsData = await sectionsRes.json();

      if (profileData.success) setProfile(profileData.data);
      if (sectionsData.success) setSections(sectionsData.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    router.push("/");
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    if (!token || !profile) return;

    try {
      const response = await fetch("/api/profile/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(profile),
      });

      const data = await response.json();
      if (data.success) {
        alert("Profile updated successfully!");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
    }
  };

  const handleAddSection = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const type = prompt(
      "Section type (projects, experience, education, skills, certifications, custom):"
    );
    const title = prompt("Section title:");

    if (!type || !title) return;

    try {
      const response = await fetch("/api/sections/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ type, title, items: [] }),
      });

      const data = await response.json();
      if (data.success) {
        setSections((prev) => [...prev, data.data]);
      }
    } catch (error) {
      console.error("Error creating section:", error);
    }
  };

  const initializeItemForm = () => ({
    title: "",
    company: "",
    date: "",
    location: "",
    description: "",
    technologies: "",
    link: "",
    isSubmitting: false,
  });

  const openItemForm = (sectionId) => {
    setItemForms((prev) => ({
      ...prev,
      [sectionId]: initializeItemForm(),
    }));
  };

  const handleItemFormChange = (sectionId, field, value) => {
    setItemForms((prev) => ({
      ...prev,
      [sectionId]: {
        ...prev[sectionId],
        [field]: value,
      },
    }));
  };

  const closeItemForm = (sectionId) => {
    setItemForms((prev) => {
      const { [sectionId]: _removed, ...rest } = prev;
      return rest;
    });
  };

  const handleAddItemToSection = async (sectionId) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const section = sections.find((s) => s._id === sectionId);
    if (!section) return;

    const form = itemForms[sectionId];
    if (!form || !form.title?.trim()) {
      alert("Item title is required");
      return;
    }

    const newItem = {
      title: form.title.trim(),
    };

    const optionalFields = [
      "company",
      "date",
      "location",
      "description",
      "link",
    ];
    optionalFields.forEach((field) => {
      const value = form[field]?.trim?.() ?? "";
      if (value) {
        newItem[field] = value;
      }
    });

    if (section.type !== "skills" && form.technologies) {
      const technologies = form.technologies
        .split(",")
        .map((tech) => tech.trim())
        .filter(Boolean);

      if (technologies.length > 0) {
        newItem.technologies = technologies;
      }
    }

    setItemForms((prev) => ({
      ...prev,
      [sectionId]: { ...prev[sectionId], isSubmitting: true },
    }));

    let shouldCloseForm = false;

    try {
      const response = await fetch("/api/sections/update", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: sectionId,
          items: [
            ...(Array.isArray(section.items) ? section.items : []),
            newItem,
          ],
        }),
      });

      const data = await response.json();
      if (data.success) {
        setSections((prevSections) =>
          prevSections.map((s) => (s._id === sectionId ? data.data : s))
        );
        shouldCloseForm = true;
      } else {
        alert(data.message || "Unable to add item. Please try again.");
      }
    } catch (error) {
      console.error("Error updating section:", error);
      alert("Something went wrong while saving the item.");
    } finally {
      if (shouldCloseForm) {
        closeItemForm(sectionId);
      } else {
        setItemForms((prev) => {
          const current = prev[sectionId];
          if (!current) {
            return prev;
          }

          return {
            ...prev,
            [sectionId]: { ...current, isSubmitting: false },
          };
        });
      }
    }
  };

  const handleDeleteSection = async (sectionId) => {
    if (!confirm("Are you sure you want to delete this section?")) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const response = await fetch(`/api/sections/delete?id=${sectionId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        setSections((prev) => prev.filter((s) => s._id !== sectionId));
        setItemForms((prev) => {
          if (!prev[sectionId]) {
            return prev;
          }
          const { [sectionId]: _removed, ...rest } = prev;
          return rest;
        });
      }
    } catch (error) {
      console.error("Error deleting section:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Link
            href="/"
            className="text-2xl font-bold text-blue-600"
          >
            FolioFusion
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href={`/profile/${profile?.username}`}
              target="_blank"
              className="px-4 py-2 text-blue-600 hover:text-blue-700"
            >
              View Portfolio →
            </Link>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-gray-600 hover:text-gray-900"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="mb-6 border-b">
          <div className="flex gap-8">
            <button
              onClick={() => setActiveTab("profile")}
              className={`pb-3 px-1 border-b-2 transition ${
                activeTab === "profile"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              Profile Setup
            </button>
            <button
              onClick={() => setActiveTab("sections")}
              className={`pb-3 px-1 border-b-2 transition ${
                activeTab === "sections"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              Manage Sections
            </button>
          </div>
        </div>

        {/* Profile Tab */}
        {activeTab === "profile" && profile && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-6">Profile Setup</h2>
            <form onSubmit={handleProfileUpdate} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={profile.fullName}
                    onChange={(e) =>
                      setProfile({ ...profile, fullName: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="your name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title
                  </label>
                  <input
                    type="text"
                    value={profile.title}
                    onChange={(e) =>
                      setProfile({ ...profile, title: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Full Stack Developer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bio
                </label>
                <textarea
                  value={profile.bio}
                  onChange={(e) =>
                    setProfile({ ...profile, bio: e.target.value })
                  }
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Tell us about yourself..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location
                </label>
                <input
                  type="text"
                  value={profile.location || ""}
                  onChange={(e) =>
                    setProfile({ ...profile, location: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Mangalure"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-4">
                  Social Links
                </label>
                <div className="grid md:grid-cols-2 gap-4">
                  <input
                    type="url"
                    placeholder="GitHub URL"
                    value={profile.socialLinks?.github || ""}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        socialLinks: {
                          ...profile.socialLinks,
                          github: e.target.value,
                        },
                      })
                    }
                    className="px-3 py-2 border border-gray-300 rounded-md"
                  />
                  <input
                    type="url"
                    placeholder="LinkedIn URL"
                    value={profile.socialLinks?.linkedin || ""}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        socialLinks: {
                          ...profile.socialLinks,
                          linkedin: e.target.value,
                        },
                      })
                    }
                    className="px-3 py-2 border border-gray-300 rounded-md"
                  />
                  <input
                    type="url"
                    placeholder="Twitter URL"
                    value={profile.socialLinks?.twitter || ""}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        socialLinks: {
                          ...profile.socialLinks,
                          twitter: e.target.value,
                        },
                      })
                    }
                    className="px-3 py-2 border border-gray-300 rounded-md"
                  />
                  <input
                    type="url"
                    placeholder="Website URL"
                    value={profile.socialLinks?.website || ""}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        socialLinks: {
                          ...profile.socialLinks,
                          website: e.target.value,
                        },
                      })
                    }
                    className="px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Theme
                  </label>
                  <select
                    value={profile.theme}
                    onChange={(e) =>
                      setProfile({ ...profile, theme: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="blue">Blue</option>
                    <option value="green">Green</option>
                    <option value="purple">Purple</option>
                    <option value="orange">Orange</option>
                    <option value="dark">Dark</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Layout
                  </label>
                  <select
                    value={profile.layout}
                    onChange={(e) =>
                      setProfile({ ...profile, layout: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="modern">Modern</option>
                    <option value="classic">Classic</option>
                    <option value="minimal">Minimal</option>
                    <option value="creative">Creative</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full md:w-auto px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Save Profile
              </button>
            </form>
          </div>
        )}

        {/* Sections Tab */}
        {activeTab === "sections" && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Manage Sections</h2>
              <button
                onClick={handleAddSection}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                + Add Section
              </button>
            </div>

            <div className="space-y-4">
              {sections.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No sections yet. Click &quot;Add Section&quot; to get started.
                </p>
              ) : (
                sections.map((section) => {
                  const formState = itemForms[section._id];
                  const isSkillsSection = section.type === "skills";
                  const isSubmitting = formState?.isSubmitting;
                  const items = Array.isArray(section.items)
                    ? section.items
                    : [];

                  return (
                    <div
                      key={section._id}
                      className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition"
                    >
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-semibold">
                            {section.title}
                          </h3>
                          <p className="text-sm text-gray-500 capitalize">
                            Type: {section.type}
                          </p>
                          <p className="text-sm text-gray-500">
                            {items.length} item(s){" "}
                            {section.visible === false
                              ? "• Hidden"
                              : "• Visible"}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => openItemForm(section._id)}
                            disabled={!!formState}
                            className="px-3 py-2 text-sm bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            + Add Item
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSection(section._id)}
                            className="px-3 py-2 text-sm text-red-600 hover:text-red-800"
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 space-y-3">
                        {items.length === 0 ? (
                          <p className="text-sm text-gray-500">No items yet.</p>
                        ) : isSkillsSection ? (
                          <div className="flex flex-wrap gap-2">
                            {items.map((item, idx) => (
                              <span
                                key={idx}
                                className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                              >
                                {item.title || item.name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          items.map((item, idx) => (
                            <div
                              key={idx}
                              className="border border-gray-100 rounded-md p-3 bg-gray-50"
                            >
                              <p className="font-medium text-gray-800">
                                {item.title}
                              </p>
                              {item.company && (
                                <p className="text-sm text-gray-600">
                                  {item.company}
                                </p>
                              )}
                              <div className="flex flex-wrap gap-3 text-xs text-gray-500 mt-1">
                                {item.date && <span>{item.date}</span>}
                                {item.location && (
                                  <span>📍 {item.location}</span>
                                )}
                              </div>
                              {item.description && (
                                <p className="text-sm text-gray-600 mt-2">
                                  {item.description}
                                </p>
                              )}
                              {Array.isArray(item.technologies) &&
                                item.technologies.length > 0 && (
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    {item.technologies.map((tech, techIdx) => (
                                      <span
                                        key={techIdx}
                                        className="px-2 py-1 bg-white border border-gray-200 rounded text-xs text-gray-600"
                                      >
                                        {tech}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              {item.link && (
                                <a
                                  href={item.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-block text-sm text-blue-600 hover:underline mt-2"
                                >
                                  View →
                                </a>
                              )}
                            </div>
                          ))
                        )}
                      </div>

                      {formState && (
                        <div className="mt-6 border-t border-gray-200 pt-4">
                          <h4 className="text-md font-semibold mb-4">
                            Add New Item
                          </h4>
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Title <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={formState.title}
                                onChange={(e) =>
                                  handleItemFormChange(
                                    section._id,
                                    "title",
                                    e.target.value
                                  )
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                placeholder={
                                  isSkillsSection
                                    ? "e.g. React"
                                    : "e.g. Senior Developer"
                                }
                                disabled={isSubmitting}
                              />
                            </div>

                            {!isSkillsSection && (
                              <>
                                <div className="grid md:grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Organization / Company
                                    </label>
                                    <input
                                      type="text"
                                      value={formState.company}
                                      onChange={(e) =>
                                        handleItemFormChange(
                                          section._id,
                                          "company",
                                          e.target.value
                                        )
                                      }
                                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                      placeholder="e.g. Acme Corp"
                                      disabled={isSubmitting}
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Date Range
                                    </label>
                                    <input
                                      type="text"
                                      value={formState.date}
                                      onChange={(e) =>
                                        handleItemFormChange(
                                          section._id,
                                          "date",
                                          e.target.value
                                        )
                                      }
                                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                      placeholder="e.g. Jan 2022 - Present"
                                      disabled={isSubmitting}
                                    />
                                  </div>
                                </div>

                                <div className="grid md:grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Location
                                    </label>
                                    <input
                                      type="text"
                                      value={formState.location}
                                      onChange={(e) =>
                                        handleItemFormChange(
                                          section._id,
                                          "location",
                                          e.target.value
                                        )
                                      }
                                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                      placeholder="e.g. Mangalure"
                                      disabled={isSubmitting}
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Link
                                    </label>
                                    <input
                                      type="url"
                                      value={formState.link}
                                      onChange={(e) =>
                                        handleItemFormChange(
                                          section._id,
                                          "link",
                                          e.target.value
                                        )
                                      }
                                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                      placeholder="https://example.com"
                                      disabled={isSubmitting}
                                    />
                                  </div>
                                </div>

                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Description
                                  </label>
                                  <textarea
                                    value={formState.description}
                                    onChange={(e) =>
                                      handleItemFormChange(
                                        section._id,
                                        "description",
                                        e.target.value
                                      )
                                    }
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                    placeholder="Share relevant details, accomplishments, or context."
                                    disabled={isSubmitting}
                                  />
                                </div>

                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Technologies (comma separated)
                                  </label>
                                  <input
                                    type="text"
                                    value={formState.technologies}
                                    onChange={(e) =>
                                      handleItemFormChange(
                                        section._id,
                                        "technologies",
                                        e.target.value
                                      )
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                    placeholder="React, Node.js"
                                    disabled={isSubmitting}
                                  />
                                </div>
                              </>
                            )}
                          </div>

                          <div className="flex gap-3 mt-4">
                            <button
                              type="button"
                              onClick={() =>
                                handleAddItemToSection(section._id)
                              }
                              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                              disabled={isSubmitting}
                            >
                              {isSubmitting ? "Saving..." : "Save Item"}
                            </button>
                            <button
                              type="button"
                              onClick={() => closeItemForm(section._id)}
                              className="px-4 py-2 text-gray-600 hover:text-gray-900"
                              disabled={isSubmitting}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
