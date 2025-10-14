import { Menu, X, Code2 } from 'lucide-react';

export default function Header() {

    return <div className="flex w-screen bg-white text-black justify-between px-[2rem] h-[4rem] shadow-lg">
        <div className="flex items-center">
            <Code2 className="h-8 w-8 text-indigo-600" />
            <span>FolioFusion</span>
        </div>
        <nav className="hidden md:flex items-center space-x-8">
            <a to="/" className="text-slate-600 hover:text-indigo-600 transition-colors">
              Home
            </a>
            <a to="/create" className="text-slate-600 hover:text-indigo-600 transition-colors">
              Create Portfolio
            </a>
            <a to="/templates" className="text-slate-600 hover:text-indigo-600 transition-colors">
              Templates
            </a>
            <a 
              to="/create" 
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Get Started
            </a>
          </nav>
    </div>
}