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
            <div className="flex space-x-6 mt-2 justify-center md:justify-end">
              <Dialog>
                <DialogTrigger asChild>
                  <button className="hover:text-white transition-colors">Privacy</button>
                </DialogTrigger>
                <DialogContent className='sm:max-w-[425px] bg-[#1A1A1A] border-[#333333] text-white'>
                  <DialogHeader>
                    <DialogTitle>Privacy</DialogTitle>
                    <DialogDescription className="text-gray-400">
                      This is where I'd keep my privacy settings... If I had any....
                    </DialogDescription>
                  </DialogHeader>
                </DialogContent>
              </Dialog>

              <Dialog>
                <DialogTrigger asChild>
                  <button className="hover:text-white transition-colors">Terms</button>
                </DialogTrigger>
                <DialogContent className='sm:max-w-[425px] bg-[#1A1A1A] border-[#333333] text-white'>
                  <DialogHeader>
                    <DialogTitle>Terms and Conditions</DialogTitle>
                    <DialogDescription className="text-gray-400">
                      This is where I'd keep my Terms and Conditions... If I had any....
                    </DialogDescription>
                  </DialogHeader>
                </DialogContent>
              </Dialog>

              <Dialog>
                <DialogTrigger asChild>
                  <button className="hover:text-white transition-colors">Support</button>
                </DialogTrigger>
                <DialogContent className='sm:max-w-[425px] bg-[#1A1A1A] border-[#333333] text-white'>
                  <DialogHeader>
                    <DialogTitle>Support</DialogTitle>
                    <DialogDescription className="text-gray-400">
                      This is where I'd give some support... If I wanted to...
                    </DialogDescription>
                  </DialogHeader>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
