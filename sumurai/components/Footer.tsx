'use client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DialogTrigger } from '@radix-ui/react-dialog';

export default function Footer() {
  return (
    <footer className="bg-[#1A1A1A] border-t border-[#333333] py-12">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center space-x-3 mb-4 md:mb-0">
            <div className="w-8 h-8 flex items-center justify-center">
              <img src="/sumurai-icon-blue.png" alt="SumurAI Logo" className="w-8 h-8 rounded-lg" />
            </div>
            <span className="text-xl font-bold text-white">SumurAI</span>
          </div>
          <div className="text-gray-300 text-center md:text-right">
            <p>&copy; 2025 SumurAI. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
