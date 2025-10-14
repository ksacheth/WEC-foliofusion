import { connectDB } from '@/lib/db/mongodb';
import Profile from '@/models/Profile';
import Section from '@/models/Section';
import { notFound } from 'next/navigation';

async function getPortfolioData(username) {
  await connectDB();
  
  const profile = await Profile.findOne({ username: username.toLowerCase() }).lean();
  if (!profile) return null;

  const sections = await Section.find({ userId: profile.userId, visible: true })
    .sort({ order: 1 })
    .lean();

  return { profile, sections };
}

// Theme colors
const themeColors = {
  blue: { bg: 'from-blue-50 to-indigo-100', accent: 'text-blue-600', text: 'text-blue-700' },
  green: { bg: 'from-green-50 to-emerald-100', accent: 'text-green-600', text: 'text-green-700' },
  purple: { bg: 'from-purple-50 to-pink-100', accent: 'text-purple-600', text: 'text-purple-700' },
  orange: { bg: 'from-orange-50 to-red-100', accent: 'text-orange-600', text: 'text-orange-700' },
  dark: { bg: 'from-gray-800 to-gray-900', accent: 'text-gray-100', text: 'text-gray-200' },
};

export default async function PortfolioPage({ params }) {
  const { username } = await params;
  const data = await getPortfolioData(username);

  if (!data) {
    notFound();
  }

  const { profile, sections } = data;
  const theme = themeColors[profile.theme] || themeColors.blue;

  return (
    <div className={`min-h-screen bg-gradient-to-br ${theme.bg}`}>
      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          {profile.avatar && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar}
              alt={profile.fullName}
              className="w-32 h-32 rounded-full mx-auto mb-6 object-cover border-4 border-white shadow-lg"
            />
          )}
          <h1 className={`text-5xl font-bold mb-4 ${theme.accent}`}>
            {profile.fullName || profile.username}
          </h1>
          {profile.title && (
            <p className="text-2xl text-gray-700 mb-4">{profile.title}</p>
          )}
          {profile.location && (
            <p className="text-gray-600 mb-4">📍 {profile.location}</p>
          )}
          {profile.bio && (
            <p className="text-lg text-gray-700 max-w-2xl mx-auto mb-8">{profile.bio}</p>
          )}

          {/* Social Links */}
          {profile.socialLinks && (
            <div className="flex justify-center gap-4 flex-wrap">
              {profile.socialLinks.github && (
                <a
                  href={profile.socialLinks.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`px-4 py-2 bg-white rounded-lg shadow hover:shadow-md transition ${theme.text}`}
                >
                  GitHub
                </a>
              )}
              {profile.socialLinks.linkedin && (
                <a
                  href={profile.socialLinks.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`px-4 py-2 bg-white rounded-lg shadow hover:shadow-md transition ${theme.text}`}
                >
                  LinkedIn
                </a>
              )}
              {profile.socialLinks.twitter && (
                <a
                  href={profile.socialLinks.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`px-4 py-2 bg-white rounded-lg shadow hover:shadow-md transition ${theme.text}`}
                >
                  Twitter
                </a>
              )}
              {profile.socialLinks.website && (
                <a
                  href={profile.socialLinks.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`px-4 py-2 bg-white rounded-lg shadow hover:shadow-md transition ${theme.text}`}
                >
                  Website
                </a>
              )}
              {profile.socialLinks.email && (
                <a
                  href={`mailto:${profile.socialLinks.email}`}
                  className={`px-4 py-2 bg-white rounded-lg shadow hover:shadow-md transition ${theme.text}`}
                >
                  Email
                </a>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Sections */}
      <section className="pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto space-y-12">
          {sections.map((section) => (
            <div key={section._id.toString()} className="bg-white rounded-xl shadow-lg p-8">
              <h2 className={`text-3xl font-bold mb-6 ${theme.accent}`}>
                {section.title}
              </h2>
              
              {section.type === 'skills' ? (
                <div className="flex flex-wrap gap-2">
                  {section.items.map((item, idx) => (
                    <span
                      key={idx}
                      className={`px-4 py-2 bg-gray-100 rounded-lg ${theme.text} font-medium`}
                    >
                      {item.title || item.name}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="space-y-6">
                  {section.items.map((item, idx) => (
                    <div key={idx} className="border-l-4 border-gray-200 pl-4">
                      <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                      {item.company && (
                        <p className="text-gray-600 mb-1">{item.company}</p>
                      )}
                      {item.date && (
                        <p className="text-sm text-gray-500 mb-2">{item.date}</p>
                      )}
                      {item.location && (
                        <p className="text-sm text-gray-500 mb-2">📍 {item.location}</p>
                      )}
                      {item.description && (
                        <p className="text-gray-700 mb-2">{item.description}</p>
                      )}
                      {item.technologies && item.technologies.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {item.technologies.map((tech, techIdx) => (
                            <span
                              key={techIdx}
                              className="px-2 py-1 bg-gray-100 text-xs rounded"
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
                          className={`inline-block mt-2 ${theme.text} hover:underline`}
                        >
                          View Project →
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {sections.length === 0 && (
            <div className="bg-white rounded-xl shadow-lg p-8 text-center text-gray-500">
              <p>No sections added yet. Check back soon!</p>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center text-gray-600">
        <p>Built with FolioFusion</p>
      </footer>
    </div>
  );
}