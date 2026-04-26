import { Facebook, Twitter, Instagram, Linkedin, Send } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-black text-gray-300 py-12 pt-32">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo and Description */}
          <div className="col-span-1 md:col-span-2">
            <h2 className="text-2xl font-bold text-white mb-4">Veliora</h2>
            <p className="mb-4">Your AI companion who understands you culturally and emotionally.
            Always there for you, with all the care in the world!</p>
            <p className="mb-4">Reach out to us at <a href="mailto:support@localhost:3000">support@localhost:3000</a></p>
            {/* <div className="flex space-x-4">
              <a href="#" className="hover:text-white transition-colors"><Facebook size={20} /></a>
              <a href="#" className="hover:text-white transition-colors"><Twitter size={20} /></a>
              <a href="#" className="hover:text-white transition-colors"><Instagram size={20} /></a>
              <a href="#" className="hover:text-white transition-colors"><Linkedin size={20} /></a>
            </div> */}
          </div>

          {/* Quick Links */}
          {/* <div>
            <h3 className="text-lg font-semibold text-white mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li><a href="#" className="hover:text-white transition-colors">Home</a></li>
              <li><a href="#" className="hover:text-white transition-colors">About</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
            </ul>
          </div> */}
        </div>

        {/* Copyright */}
        <div className="border-t border-gray-800 mt-8 pt-8 text-center">
          <p>&copy;2024 Veliora.AI. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}

