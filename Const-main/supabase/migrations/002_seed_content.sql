insert into public.site_settings (key, value)
values
  (
    'company',
    '{
      "brandName": "GOLDENLAND",
      "subtitle": "Construction & Real Estate Limited",
      "gps": "GE-134-3488",
      "location": "Ashongman Estates, Accra",
      "email": "goldenlandconstructionltd@gmail.com",
      "phone": "+233 24 347 5142",
      "phoneRaw": "+233243475142",
      "whatsapp": "2332434751427",
      "mapEmbedUrl": "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3970.4035!2d-0.1872!3d5.6245!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNcKwMzcnMjguMiJOIDDCsDExJzE0LjAiVw!5e0!3m2!1sen!2sgh!4v1620000000000!5m2!1sen!2sgh"
    }'::jsonb
  ),
  (
    'hero',
    '{
      "tagline": "ASHONGMAN ESTATES · ACCRA",
      "titlePrefix": "We do not just build structures,",
      "titleHighlight": "we build legacies",
      "description": "Premium construction and real estate development with 12+ years of excellence across Ghana.",
      "backgroundImage": "/assets/image/webaliser-_TPTXZd9mOo-unsplash.jpg",
      "videoUrl": "",
      "videoLabel": "Watch Showreel",
      "stats": [
        { "value": "150+", "label": "Projects" },
        { "value": "100%", "label": "Delivery" },
        { "value": "50+", "label": "Staff" }
      ]
    }'::jsonb
  ),
  (
    'social',
    '{
      "facebook": "#",
      "linkedin": "#",
      "instagram": "#",
      "whatsapp": "233301234567"
    }'::jsonb
  )
on conflict (key) do update set value = excluded.value, updated_at = timezone('utc', now());

insert into public.services (title, description, icon, sort_order)
values
  ('General Construction', 'Residential, commercial, and mixed-use construction delivered with strict quality control.', 'fa-building', 0),
  ('Architectural Planning', 'Concept development, drawings, and design coordination for efficient project execution.', 'fa-compass-drafting', 1),
  ('Renovation & Fit-Out', 'Full interior and exterior upgrades for homes, offices, and hospitality spaces.', 'fa-tools', 2),
  ('MEP Services', 'Mechanical, electrical, and plumbing solutions planned for long-term performance.', 'fa-bolt', 3)
on conflict do nothing;

insert into public.projects (category, title, description, location, badge, image_url, sort_order)
values
  ('residential', 'Luxury Heights', '12-storey luxury apartments with smart home integration', 'Airport City, Accra', 'Completed 2025', '/assets/image/joel-filipe-RFDP7_80v5A-unsplash.jpg', 0),
  ('commercial', 'Tema Industrial Park', '50,000 sqm warehouse and office complex', 'Tema Free Zones', 'Ongoing', '/assets/image/park-lujiazui-financial-centre.jpg', 1),
  ('residential', 'Ashongman Estate', '50 luxury homes with modern finishes', 'Ashongman, Accra', '2024', '/assets/image/michele-bitetto-84ZA1jFsfzM-unsplash.jpg', 2),
  ('infrastructure', 'Room Decoration', 'A full seven-bedroom interior finish and decoration project', 'Kumasi, Ashanti', '2023', '/assets/image/steven-ungermann-ydudT6TqqmI-unsplash.jpg', 3)
on conflict do nothing;

insert into public.testimonials (rating, text, author, role, avatar_text, avatar_color, sort_order)
values
  (5, 'GoldenLand delivered our 12-storey building ahead of schedule. Quality workmanship and a professional team.', 'James Kofi', 'CEO, JKL Holdings', 'JK', '#0b2b5c', 0),
  (5, 'Their project management team made our industrial park development stress-free. Highly recommended.', 'Abena Mensah', 'Director, Tema Free Zones', 'AM', '#2a6eb0', 1),
  (5, 'The MEP installation in our hospital wing was flawless. Professional from start to finish.', 'Dr. Asare', 'Medical Director', 'DA', '#1e4b6e', 2)
on conflict do nothing;
