import { Star } from "lucide-react";

// Illustrative placeholder content only. There's no Review entity
// yet — 02-ARCHITECTURE.md's Deliberately Deferred list and
// 01-PROJECT-STATUS.md both scope Reviews/Ratings to Month 2, and
// `Course.rating` (the only real rating today) is a teacher-entered
// number, not an aggregate of parent feedback. Keep this array
// generic/fictional and clearly labeled as a preview in the UI
// below — it should never be mistaken for real parent reviews.
const SAMPLE_REVIEWS = [
  {
    name: "Parent of an 8th grader",
    rating: 5,
    comment:
      "Once reviews are live, parents will be able to share how a demo or course went here.",
  },
  {
    name: "Parent of a 6th grader",
    rating: 4,
    comment:
      "This is placeholder text so the layout is ready for real feedback later.",
  },
  {
    name: "Parent of a 10th grader",
    rating: 5,
    comment: "Sample review card — not a real submission from a parent.",
  },
];

export default function ReviewsSection() {
  return (
    <div className="bg-white border border-violet-100 rounded-3xl shadow-sm p-5 sm:p-6">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-heading text-base font-bold text-gray-800">
          Reviews
        </h2>
        <span className="text-[10px] font-bold uppercase tracking-wide text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
          Preview
        </span>
      </div>

      <p className="text-xs text-gray-400 mb-4">
        Reviews aren&apos;t live yet — the cards below are sample content so
        this section is ready once real parent reviews launch.
      </p>

      <div className="space-y-3">
        {SAMPLE_REVIEWS.map((review, i) => (
          <div
            key={i}
            className="border border-violet-50 rounded-2xl p-4 bg-violet-50/30"
          >
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-bold text-gray-700">{review.name}</p>
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, starIndex) => (
                  <Star
                    key={starIndex}
                    size={12}
                    className={
                      starIndex < review.rating
                        ? "text-brand-yellow fill-brand-yellow"
                        : "text-gray-200 fill-gray-200"
                    }
                  />
                ))}
              </div>
            </div>
            <p className="text-sm text-gray-600">{review.comment}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
