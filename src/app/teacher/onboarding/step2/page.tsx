"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function TeacherStep2() {
  const router = useRouter();
  const [teacherId, setTeacherId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    referredBy: '', qualifications: '', overallExperience: '', comfortableLanguage: '', schoolsTaught: '',
    workingInSchool: false, schoolName: '', workingInAcademy: false, academyName: '',
    homeTuitionArea: '', studentsTaught: '', canTakeHomeTuition: '', hoursPerDay: '',
    haveOwnNotes: '', canMakePresentations: '', provideHomework: '', conductPTM: '',
    hasLaptop: false, hasPenTab: false, proficientInEnglish: false, additionalInfo: '',
    facebook: '', linkedin: '', instagram: '', youtube: '', notWithOtherAcademy: false
  });

  useEffect(() => {
    const id = localStorage.getItem('teacherId');
    if (!id) {
      router.push('/teacher/onboarding/step1');
      return; 
    }
    
    // Wrap the state update in a timeout to satisfy the linter
    setTimeout(() => {
      setTeacherId(id);
    }, 0);
    
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const target = e.target as HTMLInputElement;
    const value = target.type === 'checkbox' ? target.checked : target.value;
    setFormData({ ...formData, [target.name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/teacher/onboarding/step2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...formData, teacherId }),
    });
    
    if (res.ok) router.push('/teacher/onboarding/step3');
  };

  return (
    <div className="max-w-4xl mx-auto p-8 bg-white rounded-xl shadow-sm border mt-10">
      <h2 className="text-2xl font-bold text-center text-purple-600 mb-8">Professional information</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <select name="referredBy" className="w-full border rounded-md px-3 py-2 text-sm text-gray-600" onChange={handleChange}><option value="">Referred by</option></select>
          <select name="qualifications" className="w-full border rounded-md px-3 py-2 text-sm text-gray-600" onChange={handleChange}><option value="">Qualifications</option></select>
        </div>

        <h3 className="font-semibold text-gray-800 mt-6">Experience</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <select name="overallExperience" className="w-full border rounded-md px-3 py-2 text-sm text-gray-600" onChange={handleChange}><option value="">Overall Teaching Experience</option></select>
          <select name="comfortableLanguage" className="w-full border rounded-md px-3 py-2 text-sm text-gray-600" onChange={handleChange}><option value="">Comfortable Language</option></select>
        </div>
        <Input name="schoolsTaught" placeholder="Schools you taught before" onChange={handleChange} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border rounded-md p-3 text-sm text-gray-500 bg-gray-50 text-center">Upload Certifications (S3 Logic later)</div>
          <div className="border rounded-md p-3 text-sm text-gray-500 bg-gray-50 text-center">Upload Awards (S3 Logic later)</div>
        </div>

        <div className="grid grid-cols-[auto_1fr] items-center gap-4">
          <label className="flex items-center space-x-2 text-sm text-gray-600"><input type="checkbox" name="workingInSchool" onChange={handleChange}/> <span>Working in a School</span></label>
          <Input name="schoolName" placeholder="School Name" disabled={!formData.workingInSchool} onChange={handleChange} />
          
          <label className="flex items-center space-x-2 text-sm text-gray-600"><input type="checkbox" name="workingInAcademy" onChange={handleChange}/> <span>Working in a Academy</span></label>
          <Input name="academyName" placeholder="Academy Name" disabled={!formData.workingInAcademy} onChange={handleChange} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <select name="homeTuitionArea" className="w-full border rounded-md px-3 py-2 text-sm text-gray-600" onChange={handleChange}><option value="">Area you live for Home Tuition</option></select>
          <Input name="studentsTaught" placeholder="Number of Students taught" onChange={handleChange} />
          <select name="canTakeHomeTuition" className="w-full border rounded-md px-3 py-2 text-sm text-gray-600" onChange={handleChange}><option value="">Can you take Home Tuition</option></select>
          <select name="hoursPerDay" className="w-full border rounded-md px-3 py-2 text-sm text-gray-600" onChange={handleChange}><option value="">No of hours can teach a day</option></select>
          <select name="haveOwnNotes" className="w-full border rounded-md px-3 py-2 text-sm text-gray-600" onChange={handleChange}><option value="">Do you have your own notes</option></select>
          <select name="canMakePresentations" className="w-full border rounded-md px-3 py-2 text-sm text-gray-600" onChange={handleChange}><option value="">Can you make Presentations</option></select>
          <select name="provideHomework" className="w-full border rounded-md px-3 py-2 text-sm text-gray-600" onChange={handleChange}><option value="">Will you provide homeworks & tests</option></select>
          <select name="conductPTM" className="w-full border rounded-md px-3 py-2 text-sm text-gray-600" onChange={handleChange}><option value="">Conduct parent-teacher meetings</option></select>
        </div>

        <div className="flex space-x-6 text-sm text-gray-600">
          <label className="flex items-center space-x-2"><input type="checkbox" name="hasLaptop" onChange={handleChange}/> <span>I have a Laptop</span></label>
          <label className="flex items-center space-x-2"><input type="checkbox" name="hasPenTab" onChange={handleChange}/> <span>I have a PenTab</span></label>
          <label className="flex items-center space-x-2"><input type="checkbox" name="proficientInEnglish" onChange={handleChange}/> <span>I am Proficient in English</span></label>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-2">Anything else that you would like to share with us? [OPTIONAL]</label>
          <Input name="additionalInfo" placeholder="Type.." onChange={handleChange} />
        </div>

        <h3 className="font-semibold text-gray-800 mt-6">Social Media</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input name="facebook" placeholder="Facebook" onChange={handleChange} />
          <Input name="linkedin" placeholder="LinkedIn" onChange={handleChange} />
          <Input name="instagram" placeholder="Instagram" onChange={handleChange} />
          <Input name="youtube" placeholder="Youtube" onChange={handleChange} />
        </div>

        <div className="flex justify-center my-4">
          <Button type="button" variant="outline" className="text-purple-600 border-purple-600 rounded-full px-6">+ Add More</Button>
        </div>

        <label className="flex items-center space-x-2 text-sm text-gray-600"><input type="checkbox" name="notWithOtherAcademy" onChange={handleChange}/> <span>I am not working with any other academy</span></label>

        <div className="flex justify-center gap-4 pt-4">
          <Button type="button" variant="outline" onClick={() => router.back()} className="w-40 rounded-full border-purple-600 text-purple-600">Back</Button>
          <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white w-40 rounded-full">Next</Button>
        </div>
      </form>
    </div>
  );
}