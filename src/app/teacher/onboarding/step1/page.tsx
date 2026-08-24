"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function TeacherStep1() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', password: '',
    visibleName: '', dobDay: '', dobMonth: '', dobYear: '',
    gender: '', nationality: '', address: '', city: '',
    country: '', pincode: '', phone: '', whatsapp: '',
    aboutMe: '', criminalCase: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/teacher/onboarding/step1', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    
    if (res.ok) {
      const data = await res.json();
      localStorage.setItem('teacherId', data.teacherId);
      router.push('/teacher/onboarding/step2');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-8 bg-white rounded-xl shadow-sm border mt-10">
      <h2 className="text-2xl font-bold text-center text-purple-600 mb-8">Registration</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input name="firstName" placeholder="First Name" onChange={handleChange} required />
          <Input name="lastName" placeholder="Last Name" onChange={handleChange} required />
          <Input name="email" type="email" placeholder="Email" onChange={handleChange} required />
          <Input name="password" type="password" placeholder="Password" onChange={handleChange} required />
          
          <Input name="visibleName" placeholder="Visible Name" onChange={handleChange} />
          <div className="flex gap-2">
            <select name="dobDay" className="w-full border rounded-md px-3 py-2 text-sm text-gray-600" onChange={handleChange}><option value="">Date</option></select>
            <select name="dobMonth" className="w-full border rounded-md px-3 py-2 text-sm text-gray-600" onChange={handleChange}><option value="">Month</option></select>
            <select name="dobYear" className="w-full border rounded-md px-3 py-2 text-sm text-gray-600" onChange={handleChange}><option value="">Year</option></select>
          </div>
          
          <select name="gender" className="w-full border rounded-md px-3 py-2 text-sm text-gray-600" onChange={handleChange}><option value="">Gender</option></select>
          <select name="nationality" className="w-full border rounded-md px-3 py-2 text-sm text-gray-600" onChange={handleChange}><option value="">Nationality</option></select>
          
          <Input name="address" placeholder="Address" onChange={handleChange} />
          <select name="city" className="w-full border rounded-md px-3 py-2 text-sm text-gray-600" onChange={handleChange}><option value="">City</option></select>
          
          <select name="country" className="w-full border rounded-md px-3 py-2 text-sm text-gray-600" onChange={handleChange}><option value="">Country</option></select>
          <Input name="pincode" placeholder="Pincode" onChange={handleChange} />
          
          <Input name="phone" placeholder="Phone" onChange={handleChange} />
          <Input name="whatsapp" placeholder="WhatsApp Number" onChange={handleChange} />
        </div>
        
        <textarea 
          name="aboutMe" 
          placeholder="About me" 
          className="w-full border rounded-md p-3 text-sm text-gray-600" 
          rows={4} 
          onChange={handleChange} 
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border rounded-md p-3 flex justify-between items-center text-sm text-gray-500 cursor-not-allowed bg-gray-50">
            <span>Video Introduction (S3 logic later)</span>
          </div>
          <div className="border rounded-md p-3 flex justify-between items-center text-sm text-gray-500 cursor-not-allowed bg-gray-50">
            <span>Upload Photo (S3 logic later)</span>
          </div>
        </div>
        
        <div className="w-1/2 pr-2">
           <select name="criminalCase" className="w-full border rounded-md px-3 py-2 text-sm text-gray-600" onChange={handleChange}>
             <option value="">Criminal Court Case (Optional)</option>
           </select>
        </div>
        
        <div className="flex justify-end pt-4">
          <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white w-40 rounded-full">Next</Button>
        </div>
      </form>
    </div>
  );
}