import Footer from "../components/Footer";
import Header from "../components/Header";
import { ArrowRight, Sparkles, Users, Zap } from 'lucide-react';
import Link from "next/link";
export default function HomePage() {
  return (
    <div>
      <Header />
      <div className="flex flex-col items-center pt-[10rem] mb-[5rem]">
        <h1 className="text-7xl font-bold px-[25rem] text-center">
          Build Your Dream{" "}
          <span className="text-[#4F39F6]">Developer Portfolio</span>
        </h1>
        <p className="text-2xl px-[18rem] text-center mt-[2rem]">
          FolioFusion helps developers create stunning, responsive portfolios
          with ease. Showcase your projects, skills, and achievements with
          customizable templates and get your unique shareable link.
        </p>
        <div>
          <Link href="/auth/signup" className="bg-[#4F39F6] text-white px-6 py-3 rounded-lg mt-[3rem] hover:bg-indigo-700 transition-colors cursor-pointer">
            Get Started
          </Link>
          <button className="border border-[#4F39F6] text-[#4F39F6] px-6 py-3 rounded-lg mt-[3rem] ml-4 hover:bg-indigo-100 transition-colors cursor-pointer">
            Explore Templates
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-4xl mx-auto mt-[5rem]">
          <div className="text-center">
            <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Zap className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-800 mb-2">
              Lightning Fast
            </h3>
            <p className="text-slate-600">
              Create your portfolio in under 10 minutes with our intuitive
              builder
            </p>
          </div>

          <div className="text-center">
            <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="h-8 w-8 text-indigo-600" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-800 mb-2">
              Fully Customizable
            </h3>
            <p className="text-slate-600">
              Choose from multiple themes and customize every aspect of your
              portfolio
            </p>
          </div>

          <div className="text-center">
            <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="h-8 w-8 text-slate-600" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-800 mb-2">
              Share Anywhere
            </h3>
            <p className="text-slate-600">
              Get a unique link to share your portfolio with employers and
              clients
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
