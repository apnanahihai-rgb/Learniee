export default function TeacherMediaPlaceholder() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="border rounded-md p-3 text-sm text-gray-500 bg-gray-50">
        Video Introduction
        <span className="block text-xs mt-1">
          Upload functionality coming soon
        </span>
      </div>

      <div className="border rounded-md p-3 text-sm text-gray-500 bg-gray-50">
        Profile Photo
        <span className="block text-xs mt-1">
          Upload functionality coming soon
        </span>
      </div>
    </div>
  );
}
