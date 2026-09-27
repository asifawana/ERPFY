/**
 * Industry taxonomy — authority: ERPFY-MASTER-PLAN.md section 33.
 *
 * Section 33's shape, in full: Sector -> Industry -> Sub-Industry -> Business Type. The
 * fifth level, Business Activities, is the operation profile in section 35 and belongs to
 * the company size step, not to this tree.
 *
 * Pure data with no imports, so a new sector, industry, sub-industry or business type is a
 * data edit and nothing else — that is section 33's "a new industry can be added later
 * without core redesign" made structural rather than promised.
 *
 * Selection configures and recommends. It never locks a company (section 25), and it
 * activates no business App during the Core phase (section 34).
 */

/** Section 33's fourth level. Business types are display strings, not slugs. */
export type SubIndustry = {
  slug: string;
  name: string;
  /** The business types inside this sub-industry. */
  businessTypes: string[];
};

export type Industry = {
  slug: string;
  name: string;
  /** One line shown on the industry card and the detail hero. */
  summary: string;
  subIndustries: SubIndustry[];
};

export type Sector = {
  slug: string;
  name: string;
  summary: string;
  industries: Industry[];
};

export const SECTORS: Sector[] = [
  {
    slug: 'agriculture-food-supply',
    name: 'Agriculture & Food Supply',
    summary: 'Growers, seed and input suppliers, and the businesses that move food to market.',
    industries: [
      {
        slug: 'crop-farming',
        name: 'Crop Farming',
        summary: 'Field and greenhouse growers managing seasons, land parcels and yields.',
        subIndustries: [
          { slug: 'field-crops', name: 'Field Crops', businessTypes: ['Cereal farm', 'Cotton farm', 'Sugarcane farm', 'Contract farming'] },
          { slug: 'horticulture', name: 'Horticulture & Greenhouse', businessTypes: ['Greenhouse grower', 'Vegetable farm', 'Plant nursery'] },
          { slug: 'orchards', name: 'Orchards & Plantations', businessTypes: ['Fruit orchard', 'Olive grove', 'Tea or coffee estate'] },
        ],
      },
      {
        slug: 'seeds-agri-inputs',
        name: 'Seeds & Agri Inputs',
        summary: 'Seed, fertiliser and crop-protection suppliers selling to growers and dealers.',
        subIndustries: [
          { slug: 'seed-supply', name: 'Seed Production & Trade', businessTypes: ['Seed company', 'Seed processing plant', 'Seed dealer'] },
          { slug: 'crop-nutrition', name: 'Fertiliser & Crop Nutrition', businessTypes: ['Fertiliser supplier', 'Blending plant', 'Input importer'] },
          { slug: 'crop-protection', name: 'Crop Protection', businessTypes: ['Pesticide distributor', 'Agri dealer', 'Formulation unit'] },
        ],
      },
      {
        slug: 'food-processing',
        name: 'Food Processing',
        summary: 'Processors turning raw produce into packaged or bulk food products.',
        subIndustries: [
          { slug: 'grain-milling', name: 'Grain Milling', businessTypes: ['Flour mill', 'Rice mill', 'Feed mill'] },
          { slug: 'dairy-processing', name: 'Dairy Processing', businessTypes: ['Dairy processor', 'Cheese maker', 'Milk collection centre'] },
          { slug: 'packing-cold-chain', name: 'Packing & Cold Chain', businessTypes: ['Packhouse', 'Cold storage', 'Frozen foods producer'] },
        ],
      },
    ],
  },
  {
    slug: 'retail-ecommerce',
    name: 'Retail & Ecommerce',
    summary: 'Physical stores, online storefronts and hybrid retailers.',
    industries: [
      {
        slug: 'general-retail',
        name: 'General Retail',
        summary: 'Single-store and multi-branch retailers serving walk-in customers.',
        subIndustries: [
          { slug: 'single-store', name: 'Single Store', businessTypes: ['Single store', 'Convenience store', 'Neighbourhood shop'] },
          { slug: 'multi-branch', name: 'Multi-branch Chain', businessTypes: ['Multi-branch chain', 'Department store', 'Supermarket'] },
          { slug: 'franchise-retail', name: 'Franchise Retail', businessTypes: ['Franchise outlet', 'Franchisor', 'Concession counter'] },
        ],
      },
      {
        slug: 'online-retail',
        name: 'Online Retail',
        summary: 'Online-only and marketplace sellers shipping to customers.',
        subIndustries: [
          { slug: 'own-webstore', name: 'Own Webstore', businessTypes: ['Own webstore', 'D2C brand', 'Subscription box'] },
          { slug: 'marketplace-selling', name: 'Marketplace Selling', businessTypes: ['Marketplace seller', 'Multi-channel seller', 'Dropshipper'] },
          { slug: 'social-commerce', name: 'Social Commerce', businessTypes: ['Social media shop', 'Live selling', 'Reseller network'] },
        ],
      },
      {
        slug: 'specialty-retail',
        name: 'Specialty Retail',
        summary: 'Category specialists with catalogue, variant or serial-number depth.',
        subIndustries: [
          { slug: 'electronics-appliances', name: 'Electronics & Appliances', businessTypes: ['Electronics retail', 'Mobile phones', 'Home appliances'] },
          { slug: 'fashion-apparel', name: 'Fashion & Apparel', businessTypes: ['Apparel retail', 'Footwear', 'Jewellery'] },
          { slug: 'health-beauty-retail', name: 'Health & Beauty Retail', businessTypes: ['Pharmacy retail', 'Optical', 'Cosmetics'] },
          { slug: 'home-hardware', name: 'Home & Hardware', businessTypes: ['Hardware store', 'Furniture retail', 'Building materials retail'] },
        ],
      },
    ],
  },
  {
    slug: 'wholesale-distribution',
    name: 'Wholesale & Distribution',
    summary: 'Businesses supplying other businesses through dealer and distributor networks.',
    industries: [
      {
        slug: 'wholesale-trading',
        name: 'Wholesale Trading',
        summary: 'Bulk buyers and sellers working on price tiers and credit terms.',
        subIndustries: [
          { slug: 'bulk-trading', name: 'Bulk Trading', businessTypes: ['Bulk trader', 'Cash-and-carry', 'Stockist'] },
          { slug: 'commodity-trading', name: 'Commodity Trading', businessTypes: ['Commodity trader', 'Grain trader', 'Metals trader'] },
          { slug: 'fmcg-wholesale', name: 'FMCG Wholesale', businessTypes: ['FMCG wholesaler', 'Beverage wholesaler', 'Confectionery wholesaler'] },
        ],
      },
      {
        slug: 'distribution-networks',
        name: 'Distribution Networks',
        summary: 'Distributors running territories, dealers and secondary sales.',
        subIndustries: [
          { slug: 'national-distribution', name: 'National Distribution', businessTypes: ['National distributor', 'Sole agent', 'Importer-distributor'] },
          { slug: 'regional-distribution', name: 'Regional Distribution', businessTypes: ['Regional distributor', 'Sub-distributor', 'Van sales operation'] },
          { slug: 'dealer-networks', name: 'Dealer Networks', businessTypes: ['Dealer network', 'Franchise network', 'Channel partner programme'] },
        ],
      },
    ],
  },
  {
    slug: 'manufacturing',
    name: 'Manufacturing',
    summary: 'Make-to-stock, make-to-order and assembly operations.',
    industries: [
      {
        slug: 'discrete-manufacturing',
        name: 'Discrete Manufacturing',
        summary: 'Assembled products built from a bill of materials.',
        subIndustries: [
          { slug: 'assembly-fabrication', name: 'Assembly & Fabrication', businessTypes: ['Assembly plant', 'Metal fabrication', 'Electronics assembly'] },
          { slug: 'job-shop', name: 'Job Shop & Machining', businessTypes: ['Job shop', 'CNC machining', 'Tool and die'] },
          { slug: 'contract-manufacturing', name: 'Contract Manufacturing', businessTypes: ['Contract manufacturer', 'OEM supplier', 'White-label producer'] },
        ],
      },
      {
        slug: 'process-manufacturing',
        name: 'Process Manufacturing',
        summary: 'Batch and formula-based production with yield and quality control.',
        subIndustries: [
          { slug: 'chemicals', name: 'Chemicals', businessTypes: ['Chemical plant', 'Paints and coatings', 'Industrial gases'] },
          { slug: 'food-batch', name: 'Food & Beverage Batch', businessTypes: ['Food batch producer', 'Sauces and condiments', 'Snack producer'] },
          { slug: 'personal-care', name: 'Personal Care & Household', businessTypes: ['Cosmetics', 'Soap and detergent', 'Nutraceuticals'] },
        ],
      },
    ],
  },
  {
    slug: 'professional-services',
    name: 'Professional Services',
    summary: 'Advisory, agency and expert-led firms billing time and deliverables.',
    industries: [
      {
        slug: 'consulting',
        name: 'Consulting',
        summary: 'Advisory firms delivering engagements against scoped outcomes.',
        subIndustries: [
          { slug: 'management-consulting', name: 'Management Consulting', businessTypes: ['Management consulting', 'Strategy advisory', 'HR consulting'] },
          { slug: 'technical-consulting', name: 'Engineering & Technical', businessTypes: ['Engineering consultancy', 'Architecture practice', 'Surveying'] },
          { slug: 'independent-advisors', name: 'Independent Advisors', businessTypes: ['Independent advisor', 'Fractional executive', 'Trainer-consultant'] },
        ],
      },
      {
        slug: 'agencies',
        name: 'Agencies',
        summary: 'Creative, marketing and digital agencies running client retainers.',
        subIndustries: [
          { slug: 'marketing-advertising', name: 'Marketing & Advertising', businessTypes: ['Marketing agency', 'Advertising agency', 'PR agency'] },
          { slug: 'creative-design', name: 'Creative & Design', businessTypes: ['Design studio', 'Video production', 'Content studio'] },
          { slug: 'media-performance', name: 'Media & Performance', businessTypes: ['Media buying', 'Performance marketing', 'SEO agency'] },
        ],
      },
      {
        slug: 'accounting-legal',
        name: 'Accounting & Legal',
        summary: 'Regulated practices with client files, deadlines and retention duties.',
        subIndustries: [
          { slug: 'accounting-audit', name: 'Accounting & Audit', businessTypes: ['Accounting practice', 'Audit firm', 'Bookkeeping service'] },
          { slug: 'tax-advisory', name: 'Tax & Corporate Services', businessTypes: ['Tax consultancy', 'Payroll bureau', 'Company secretarial'] },
          { slug: 'legal-practice', name: 'Legal Practice', businessTypes: ['Law firm', 'Notary', 'Legal consultancy'] },
        ],
      },
    ],
  },
  {
    slug: 'technology',
    name: 'Technology',
    summary: 'Software, IT services and hardware businesses.',
    industries: [
      {
        slug: 'software-saas',
        name: 'Software & SaaS',
        summary: 'Product companies with subscriptions, releases and support queues.',
        subIndustries: [
          { slug: 'saas-product', name: 'SaaS Product', businessTypes: ['SaaS product', 'Platform business', 'Developer tools'] },
          { slug: 'software-house', name: 'Software House', businessTypes: ['Software house', 'Custom development', 'Offshore development centre'] },
          { slug: 'apps-games', name: 'Apps & Games', businessTypes: ['Mobile app studio', 'Game studio', 'Web app studio'] },
        ],
      },
      {
        slug: 'it-services',
        name: 'IT Services',
        summary: 'Managed services, integration and support providers.',
        subIndustries: [
          { slug: 'managed-services', name: 'Managed Services', businessTypes: ['Managed service provider', 'IT support', 'Helpdesk'] },
          { slug: 'integration-infrastructure', name: 'Integration & Infrastructure', businessTypes: ['System integrator', 'Network services', 'Cloud services'] },
          { slug: 'hardware-supply', name: 'Hardware Supply & Repair', businessTypes: ['IT hardware reseller', 'Device repair', 'Peripherals supply'] },
        ],
      },
    ],
  },
  {
    slug: 'printing-packaging',
    name: 'Printing & Packaging',
    summary: 'Print production and packaging converters working to job specifications.',
    industries: [
      {
        slug: 'commercial-printing',
        name: 'Commercial Printing',
        summary: 'Job-based print production with estimates, plates and finishing.',
        subIndustries: [
          { slug: 'offset-printing', name: 'Offset Printing', businessTypes: ['Offset press', 'Book printing', 'Newspaper print'] },
          { slug: 'digital-printing', name: 'Digital Printing', businessTypes: ['Digital print shop', 'Print-on-demand', 'Copy centre'] },
          { slug: 'large-format', name: 'Large Format & Signage', businessTypes: ['Large format', 'Signage maker', 'Vehicle wraps'] },
        ],
      },
      {
        slug: 'packaging',
        name: 'Packaging',
        summary: 'Carton, label and flexible packaging converters.',
        subIndustries: [
          { slug: 'paper-board', name: 'Paper & Board', businessTypes: ['Carton maker', 'Corrugated box plant', 'Paper bag maker'] },
          { slug: 'labels', name: 'Labels & Sleeves', businessTypes: ['Label printer', 'Shrink sleeves', 'Barcode labels'] },
          { slug: 'flexible-rigid', name: 'Flexible & Rigid', businessTypes: ['Flexible packaging', 'Plastic containers', 'Glass and tin packing'] },
        ],
      },
    ],
  },
  {
    slug: 'construction-contractors',
    name: 'Construction & Contractors',
    summary: 'Project-driven builders, trades and infrastructure contractors.',
    industries: [
      {
        slug: 'building-construction',
        name: 'Building Construction',
        summary: 'Site projects with phases, subcontractors and progress billing.',
        subIndustries: [
          { slug: 'general-contracting', name: 'General Contracting', businessTypes: ['General contractor', 'Turnkey builder', 'Renovation contractor'] },
          { slug: 'civil-infrastructure', name: 'Civil & Infrastructure', businessTypes: ['Civil works', 'Roads and bridges', 'Water works'] },
          { slug: 'property-development', name: 'Property Development', businessTypes: ['Developer', 'Housing scheme', 'Commercial development'] },
        ],
      },
      {
        slug: 'specialist-trades',
        name: 'Specialist Trades',
        summary: 'Electrical, plumbing, HVAC and finishing trades.',
        subIndustries: [
          { slug: 'electrical-mechanical', name: 'Electrical & Mechanical', businessTypes: ['Electrical contractor', 'HVAC', 'Lifts and elevators'] },
          { slug: 'plumbing-water', name: 'Plumbing & Water', businessTypes: ['Plumbing', 'Sanitary works', 'Firefighting systems'] },
          { slug: 'finishing-fitout', name: 'Finishing & Fit-out', businessTypes: ['Interior fit-out', 'Painting', 'Aluminium and glazing'] },
        ],
      },
    ],
  },
  {
    slug: 'property-real-estate',
    name: 'Property / Real Estate',
    summary: 'Owners, agencies and managers of property portfolios.',
    industries: [
      {
        slug: 'property-management',
        name: 'Property Management',
        summary: 'Tenancies, leases, renewals and maintenance across a portfolio.',
        subIndustries: [
          { slug: 'residential-management', name: 'Residential Management', businessTypes: ['Residential manager', 'Society management', 'Short-let management'] },
          { slug: 'commercial-management', name: 'Commercial Management', businessTypes: ['Commercial manager', 'Mall management', 'Office park'] },
          { slug: 'facilities', name: 'Facilities & Maintenance', businessTypes: ['Facilities management', 'Cleaning services', 'Security services'] },
        ],
      },
      {
        slug: 'real-estate-agency',
        name: 'Real Estate Agency',
        summary: 'Listings, viewings and commissions across agents.',
        subIndustries: [
          { slug: 'sales-brokerage', name: 'Sales & Brokerage', businessTypes: ['Sales agency', 'Brokerage', 'Land dealing'] },
          { slug: 'lettings', name: 'Lettings & Rentals', businessTypes: ['Letting agency', 'Rental management', 'Holiday lets'] },
          { slug: 'valuation-advisory', name: 'Valuation & Advisory', businessTypes: ['Valuation', 'Investment advisory', 'Property consultancy'] },
        ],
      },
    ],
  },
  {
    slug: 'automotive',
    name: 'Automotive',
    summary: 'Vehicle sales, parts and service businesses.',
    industries: [
      {
        slug: 'vehicle-dealership',
        name: 'Vehicle Dealership',
        summary: 'New and used vehicle sales with stock units and documentation.',
        subIndustries: [
          { slug: 'new-vehicles', name: 'New Vehicles', businessTypes: ['New car dealer', 'Authorised dealership', 'Commercial vehicle dealer'] },
          { slug: 'used-vehicles', name: 'Used Vehicles', businessTypes: ['Used car dealer', 'Car marketplace', 'Auction trader'] },
          { slug: 'two-three-wheelers', name: 'Two & Three Wheelers', businessTypes: ['Motorcycle dealer', 'Scooter dealer', 'Rickshaw dealer'] },
        ],
      },
      {
        slug: 'parts-workshop',
        name: 'Parts & Workshop',
        summary: 'Parts counters and service workshops working on job cards.',
        subIndustries: [
          { slug: 'parts-trade', name: 'Parts Trade', businessTypes: ['Spare parts retail', 'Parts distributor', 'Accessories shop'] },
          { slug: 'service-workshop', name: 'Service Workshop', businessTypes: ['Service workshop', 'Body shop', 'Mobile mechanic'] },
          { slug: 'tyres-batteries', name: 'Tyres & Batteries', businessTypes: ['Tyre and battery', 'Wheel alignment', 'Car care'] },
        ],
      },
    ],
  },
  {
    slug: 'transportation-logistics',
    name: 'Transportation & Logistics',
    summary: 'Freight, fleet and warehousing operators.',
    industries: [
      {
        slug: 'freight-transport',
        name: 'Freight & Transport',
        summary: 'Trip-based movement of goods with vehicles and drivers.',
        subIndustries: [
          { slug: 'road-freight', name: 'Road Freight', businessTypes: ['Trucking', 'Fleet operator', 'Container haulage'] },
          { slug: 'courier-last-mile', name: 'Courier & Last Mile', businessTypes: ['Courier', 'Parcel delivery', 'Rider network'] },
          { slug: 'freight-forwarding', name: 'Freight Forwarding', businessTypes: ['Freight forwarder', 'Customs clearing', 'Shipping agency'] },
        ],
      },
      {
        slug: 'warehousing',
        name: 'Warehousing',
        summary: 'Third-party storage, handling and fulfilment.',
        subIndustries: [
          { slug: 'third-party-logistics', name: 'Third-party Logistics', businessTypes: ['3PL', 'Contract logistics', 'Distribution centre'] },
          { slug: 'ecommerce-fulfilment', name: 'Ecommerce Fulfilment', businessTypes: ['Fulfilment centre', 'Pick and pack', 'Returns processing'] },
          { slug: 'specialised-storage', name: 'Specialised Storage', businessTypes: ['Bonded warehouse', 'Cold store', 'Bulk yard'] },
        ],
      },
    ],
  },
  {
    slug: 'food-beverage',
    name: 'Food & Beverage',
    summary: 'Producers and suppliers of prepared food and drink.',
    industries: [
      {
        slug: 'bakery-confectionery',
        name: 'Bakery & Confectionery',
        summary: 'Daily production with short shelf life and route delivery.',
        subIndustries: [
          { slug: 'bakery-production', name: 'Bakery Production', businessTypes: ['Bakery', 'Bread plant', 'Wholesale baker'] },
          { slug: 'patisserie', name: 'Patisserie & Cakes', businessTypes: ['Patisserie', 'Cake shop', 'Dessert studio'] },
          { slug: 'confectionery', name: 'Confectionery', businessTypes: ['Confectioner', 'Chocolate maker', 'Sweets and mithai'] },
        ],
      },
      {
        slug: 'beverage',
        name: 'Beverage',
        summary: 'Bottling, distribution and beverage brands.',
        subIndustries: [
          { slug: 'bottling-water', name: 'Bottling & Water', businessTypes: ['Bottler', 'Water plant', 'Soft drinks producer'] },
          { slug: 'juices-dairy-drinks', name: 'Juices & Dairy Drinks', businessTypes: ['Juice producer', 'Flavoured milk', 'Smoothie brand'] },
          { slug: 'coffee-tea', name: 'Coffee & Tea', businessTypes: ['Coffee roaster', 'Tea packer', 'Beverage brand'] },
        ],
      },
    ],
  },
  {
    slug: 'restaurants',
    name: 'Restaurants',
    summary: 'Dine-in, takeaway and multi-outlet food service.',
    industries: [
      {
        slug: 'restaurant-operations',
        name: 'Restaurant Operations',
        summary: 'Outlets, menus, shifts and daily settlement.',
        subIndustries: [
          { slug: 'dine-in', name: 'Dine-in Restaurants', businessTypes: ['Single restaurant', 'Fine dining', 'Family restaurant'] },
          { slug: 'quick-service', name: 'Quick Service & Chains', businessTypes: ['Multi-outlet chain', 'Fast food', 'Franchise outlet'] },
          { slug: 'cafe-cloud-kitchen', name: 'Cafes & Cloud Kitchens', businessTypes: ['Cafe', 'Cloud kitchen', 'Dessert cafe'] },
        ],
      },
      {
        slug: 'catering',
        name: 'Catering',
        summary: 'Event and contract catering planned per booking.',
        subIndustries: [
          { slug: 'event-catering', name: 'Event Catering', businessTypes: ['Event caterer', 'Wedding catering', 'Outdoor catering'] },
          { slug: 'contract-catering', name: 'Contract Catering', businessTypes: ['Contract caterer', 'Canteen operator', 'Institutional catering'] },
          { slug: 'meal-services', name: 'Meal Services', businessTypes: ['Tiffin service', 'Meal subscription', 'Corporate meals'] },
        ],
      },
    ],
  },
  {
    slug: 'hospitality',
    name: 'Hospitality',
    summary: 'Accommodation and guest-experience businesses.',
    industries: [
      {
        slug: 'accommodation',
        name: 'Accommodation',
        summary: 'Rooms, rates and guest stays across properties.',
        subIndustries: [
          { slug: 'hotels', name: 'Hotels', businessTypes: ['Hotel', 'Boutique hotel', 'Business hotel'] },
          { slug: 'guest-houses', name: 'Guest Houses & Apartments', businessTypes: ['Guest house', 'Serviced apartments', 'Hostel'] },
          { slug: 'resorts', name: 'Resorts & Leisure', businessTypes: ['Resort', 'Farmhouse', 'Camp site'] },
        ],
      },
    ],
  },
  {
    slug: 'healthcare-pharmacy',
    name: 'Healthcare / Pharmacy',
    summary: 'Care providers and pharmacies. Every screen in this sector is domain-reviewed before release.',
    industries: [
      {
        slug: 'clinics',
        name: 'Clinics & Practices',
        summary: 'Appointment-led care with patient records and clinical governance.',
        subIndustries: [
          { slug: 'general-practice', name: 'General Practice', businessTypes: ['General clinic', 'Family practice', 'Polyclinic'] },
          { slug: 'dental-specialist', name: 'Dental & Specialist', businessTypes: ['Dental practice', 'Eye clinic', 'Physiotherapy'] },
          { slug: 'diagnostics', name: 'Diagnostics', businessTypes: ['Diagnostic centre', 'Pathology lab', 'Imaging centre'] },
        ],
      },
      {
        slug: 'pharmacy',
        name: 'Pharmacy',
        summary: 'Dispensing with batch, expiry and regulatory control.',
        subIndustries: [
          { slug: 'retail-pharmacy', name: 'Retail Pharmacy', businessTypes: ['Retail pharmacy', 'Chain pharmacy', 'Online pharmacy'] },
          { slug: 'institutional-pharmacy', name: 'Institutional Pharmacy', businessTypes: ['Hospital pharmacy', 'Clinic dispensary', 'Care home supply'] },
          { slug: 'pharma-distribution', name: 'Pharma Distribution', businessTypes: ['Pharma distributor', 'Medical devices supply', 'Pharma importer'] },
        ],
      },
    ],
  },
  {
    slug: 'education-training',
    name: 'Education & Training',
    summary: 'Schools, institutes and training providers.',
    industries: [
      {
        slug: 'schools',
        name: 'Schools & Institutes',
        summary: 'Enrolment, sessions, staff and fee cycles.',
        subIndustries: [
          { slug: 'schools-k12', name: 'Schools', businessTypes: ['School', 'Primary school', 'Secondary school'] },
          { slug: 'colleges-universities', name: 'Colleges & Universities', businessTypes: ['College', 'University', 'Institute'] },
          { slug: 'tuition-coaching', name: 'Tuition & Coaching', businessTypes: ['Coaching centre', 'Tuition academy', 'Test preparation'] },
        ],
      },
      {
        slug: 'training-providers',
        name: 'Training Providers',
        summary: 'Course-based delivery to individuals and companies.',
        subIndustries: [
          { slug: 'vocational', name: 'Vocational Training', businessTypes: ['Vocational training', 'Trade school', 'Skills centre'] },
          { slug: 'corporate-training', name: 'Corporate Training', businessTypes: ['Corporate training', 'Certification provider', 'Workshop provider'] },
          { slug: 'online-learning', name: 'Online Learning', businessTypes: ['Online academy', 'Course creator', 'Cohort programme'] },
        ],
      },
    ],
  },
  {
    slug: 'textile-garments',
    name: 'Textile & Garments',
    summary: 'Fabric, apparel and made-to-order garment production.',
    industries: [
      {
        slug: 'textile-mills',
        name: 'Textile Mills',
        summary: 'Spinning, weaving, dyeing and finishing operations.',
        subIndustries: [
          { slug: 'spinning', name: 'Spinning', businessTypes: ['Spinning mill', 'Yarn trading', 'Ginning'] },
          { slug: 'weaving-knitting', name: 'Weaving & Knitting', businessTypes: ['Weaving unit', 'Knitting unit', 'Power loom'] },
          { slug: 'dyeing-finishing', name: 'Dyeing & Finishing', businessTypes: ['Dyeing house', 'Textile printing', 'Finishing mill'] },
        ],
      },
      {
        slug: 'garment-manufacturing',
        name: 'Garment Manufacturing',
        summary: 'Style, size and colour matrices produced against orders.',
        subIndustries: [
          { slug: 'stitching-units', name: 'Stitching Units', businessTypes: ['Stitching unit', 'Cut-make-trim', 'Sampling unit'] },
          { slug: 'export-garments', name: 'Export Garments', businessTypes: ['Export garments', 'Buying house', 'Private label supplier'] },
          { slug: 'uniforms-workwear', name: 'Uniforms & Workwear', businessTypes: ['Uniform maker', 'Workwear supplier', 'School uniforms'] },
        ],
      },
    ],
  },
  {
    slug: 'beauty-fitness-wellness',
    name: 'Beauty / Fitness / Wellness',
    summary: 'Appointment and membership businesses.',
    industries: [
      {
        slug: 'salon-spa',
        name: 'Salon & Spa',
        summary: 'Staff-linked services booked into a daily calendar.',
        subIndustries: [
          { slug: 'salons', name: 'Salons', businessTypes: ['Salon', 'Barber shop', 'Beauty parlour'] },
          { slug: 'spa-wellness', name: 'Spa & Wellness', businessTypes: ['Spa', 'Massage centre', 'Wellness centre'] },
          { slug: 'aesthetics', name: 'Aesthetics & Skin', businessTypes: ['Skin clinic', 'Laser centre', 'Nail studio'] },
        ],
      },
      {
        slug: 'fitness',
        name: 'Fitness',
        summary: 'Memberships, classes and attendance.',
        subIndustries: [
          { slug: 'gyms', name: 'Gyms', businessTypes: ['Gym', 'Fitness centre', 'Strength facility'] },
          { slug: 'studios', name: 'Studios', businessTypes: ['Fitness studio', 'Yoga studio', 'Dance studio'] },
          { slug: 'sports-clubs', name: 'Sports Clubs & Academies', businessTypes: ['Sports club', 'Sports academy', 'Sports facility'] },
        ],
      },
    ],
  },
  {
    slug: 'travel-tourism',
    name: 'Travel & Tourism',
    summary: 'Tour operators, agencies and transport-led travel businesses.',
    industries: [
      {
        slug: 'travel-agency',
        name: 'Travel Agency',
        summary: 'Bookings, suppliers and traveller documentation.',
        subIndustries: [
          { slug: 'retail-travel', name: 'Retail Travel', businessTypes: ['Travel agency', 'Ticketing agency', 'Online travel agency'] },
          { slug: 'tour-operations', name: 'Tour Operations', businessTypes: ['Tour operator', 'Destination management', 'Pilgrimage operator'] },
          { slug: 'visa-services', name: 'Visa & Documentation', businessTypes: ['Visa services', 'Immigration consultancy', 'Travel insurance'] },
        ],
      },
    ],
  },
  {
    slug: 'events',
    name: 'Events',
    summary: 'Event production, venues and event services.',
    industries: [
      {
        slug: 'event-management',
        name: 'Event Management',
        summary: 'Events run as projects with vendors, crew and schedules.',
        subIndustries: [
          { slug: 'event-planning', name: 'Event Planning', businessTypes: ['Event planner', 'Wedding planner', 'Corporate events'] },
          { slug: 'production-technical', name: 'Production & Technical', businessTypes: ['Production company', 'Audio-visual and staging', 'Lighting and sound'] },
          { slug: 'venues', name: 'Venues', businessTypes: ['Venue operator', 'Banquet hall', 'Exhibition centre'] },
        ],
      },
    ],
  },
  {
    slug: 'rental',
    name: 'Rental',
    summary: 'Businesses that hire out assets for a period.',
    industries: [
      {
        slug: 'equipment-rental',
        name: 'Equipment Rental',
        summary: 'Assets out on hire with return, condition and deposit tracking.',
        subIndustries: [
          { slug: 'construction-plant', name: 'Construction Plant', businessTypes: ['Construction equipment', 'Scaffolding', 'Generator rental'] },
          { slug: 'event-equipment', name: 'Event Equipment', businessTypes: ['Event equipment', 'Furniture rental', 'Audio-visual rental'] },
          { slug: 'vehicle-rental', name: 'Vehicle Rental', businessTypes: ['Vehicle rental', 'Car with driver', 'Fleet leasing'] },
        ],
      },
    ],
  },
  {
    slug: 'energy',
    name: 'Energy',
    summary: 'Generation, distribution and energy service providers.',
    industries: [
      {
        slug: 'renewables',
        name: 'Renewables',
        summary: 'Installations and service contracts across sites.',
        subIndustries: [
          { slug: 'solar', name: 'Solar', businessTypes: ['Solar installer', 'Solar EPC', 'Panel supplier'] },
          { slug: 'wind-hydro', name: 'Wind & Hydro', businessTypes: ['Wind services', 'Hydro operations', 'Turbine maintenance'] },
          { slug: 'energy-advisory', name: 'Energy Advisory', businessTypes: ['Energy consultancy', 'Energy audit', 'Efficiency retrofits'] },
        ],
      },
      {
        slug: 'fuel-distribution',
        name: 'Fuel Distribution',
        summary: 'Bulk fuel supply, stations and tanker movement.',
        subIndustries: [
          { slug: 'retail-fuel', name: 'Retail Fuel', businessTypes: ['Fuel station', 'Forecourt operator', 'Service station'] },
          { slug: 'bulk-fuel', name: 'Bulk Fuel', businessTypes: ['Bulk supplier', 'Tanker operator', 'Fuel depot'] },
          { slug: 'lpg-cng', name: 'LPG & CNG', businessTypes: ['LPG distributor', 'Cylinder plant', 'CNG station'] },
        ],
      },
    ],
  },
  {
    slug: 'mining-heavy-industry',
    name: 'Mining / Heavy Industry',
    summary: 'Extraction and heavy processing with strict compliance duties.',
    industries: [
      {
        slug: 'extraction',
        name: 'Extraction',
        summary: 'Sites, heavy plant, shifts and statutory reporting.',
        subIndustries: [
          { slug: 'quarrying', name: 'Quarrying', businessTypes: ['Quarry', 'Sand and gravel', 'Stone cutting'] },
          { slug: 'mining', name: 'Mining', businessTypes: ['Mine', 'Coal operations', 'Mineral extraction'] },
          { slug: 'processing-plants', name: 'Processing Plants', businessTypes: ['Crushing plant', 'Screening plant', 'Washing plant'] },
        ],
      },
    ],
  },
  {
    slug: 'non-profit',
    name: 'Non-Profit / Associations',
    summary: 'Membership bodies, charities and grant-funded organisations.',
    industries: [
      {
        slug: 'charities',
        name: 'Charities & NGOs',
        summary: 'Programmes, donors and restricted-fund accountability.',
        subIndustries: [
          { slug: 'charitable-trusts', name: 'Charities & Trusts', businessTypes: ['Charity', 'Welfare trust', 'Relief organisation'] },
          { slug: 'ngos', name: 'NGOs & Development', businessTypes: ['NGO', 'Development programme', 'Advocacy organisation'] },
          { slug: 'foundations', name: 'Foundations & Grantmaking', businessTypes: ['Foundation', 'Endowment', 'Grant programme'] },
        ],
      },
      {
        slug: 'associations',
        name: 'Associations',
        summary: 'Members, subscriptions and governance.',
        subIndustries: [
          { slug: 'trade-bodies', name: 'Trade Bodies', businessTypes: ['Trade association', 'Chamber of commerce', 'Industry council'] },
          { slug: 'professional-bodies', name: 'Professional Bodies', businessTypes: ['Professional body', 'Licensing board', 'Professional institute'] },
          { slug: 'clubs-membership', name: 'Clubs & Membership', businessTypes: ['Club', 'Sports association', 'Alumni body'] },
        ],
      },
    ],
  },
  {
    slug: 'public-sector',
    name: 'Public Sector',
    summary: 'Government and public bodies with procurement and audit obligations.',
    industries: [
      {
        slug: 'public-administration',
        name: 'Public Administration',
        summary: 'Departments and agencies with budget and audit control.',
        subIndustries: [
          { slug: 'local-government', name: 'Local Government', businessTypes: ['Local authority', 'Municipality', 'Council department'] },
          { slug: 'agencies-authorities', name: 'Agencies & Authorities', businessTypes: ['Government agency', 'Regulator', 'Development authority'] },
          { slug: 'public-utilities', name: 'Public Utilities', businessTypes: ['Public utility', 'Water authority', 'Power distribution'] },
        ],
      },
    ],
  },
  {
    slug: 'import-export',
    name: 'Import / Export',
    summary: 'Cross-border trading with customs, documentation and multi-currency exposure.',
    industries: [
      {
        slug: 'trading-house',
        name: 'Trading House',
        summary: 'Shipment-led buying and selling across borders.',
        subIndustries: [
          { slug: 'import', name: 'Import', businessTypes: ['Importer', 'Clearing and forwarding', 'Indent agent'] },
          { slug: 'export', name: 'Export', businessTypes: ['Exporter', 'Export house', 'Merchant exporter'] },
          { slug: 're-export', name: 'Re-export & Transit', businessTypes: ['Re-exporter', 'Transit trader', 'Free-zone trader'] },
        ],
      },
    ],
  },
  {
    slug: 'repair-field-service',
    name: 'Repair / Field Service',
    summary: 'On-site and workshop service businesses working on jobs and callouts.',
    industries: [
      {
        slug: 'field-service',
        name: 'Field Service',
        summary: 'Technicians dispatched to customer sites against jobs.',
        subIndustries: [
          { slug: 'appliance-electronics', name: 'Appliance & Electronics Service', businessTypes: ['Appliance service', 'Electronics repair', 'Warranty service'] },
          { slug: 'industrial-maintenance', name: 'Industrial Maintenance', businessTypes: ['Equipment maintenance', 'Plant servicing', 'Calibration'] },
          { slug: 'installation-commissioning', name: 'Installation & Commissioning', businessTypes: ['Installation', 'Solar installation', 'Network installation'] },
        ],
      },
    ],
  },
  {
    slug: 'general-mixed',
    name: 'General / Mixed Business',
    summary: 'Businesses that span several activities and want a neutral starting point.',
    industries: [
      {
        slug: 'general-business',
        name: 'General Business',
        summary: 'A neutral configuration you can refine later from Settings.',
        subIndustries: [
          { slug: 'mixed-trading', name: 'Mixed Trading', businessTypes: ['Mixed trading', 'Trading and services', 'Small business'] },
          { slug: 'group-holding', name: 'Group & Holding', businessTypes: ['Holding company', 'Group office', 'Investment company'] },
          { slug: 'family-business', name: 'Family Business', businessTypes: ['Family business', 'Sole proprietor', 'Partnership'] },
        ],
      },
    ],
  },
  {
    slug: 'other-custom',
    name: 'Other / Custom',
    summary: 'Tell us the business and we configure a starting point with you.',
    industries: [
      {
        slug: 'custom',
        name: 'Custom',
        summary: 'For businesses that do not fit the published taxonomy yet.',
        subIndustries: [
          { slug: 'described-during-setup', name: 'Described During Setup', businessTypes: ['Tell us in your own words'] },
        ],
      },
    ],
  },
];

export const ALL_INDUSTRIES: (Industry & { sector: Sector })[] = SECTORS.flatMap((sector) =>
  sector.industries.map((industry) => ({ ...industry, sector })),
);

export function findIndustry(slug: string) {
  return ALL_INDUSTRIES.find((industry) => industry.slug === slug);
}

export function findSector(slug: string) {
  return SECTORS.find((sector) => sector.slug === slug);
}

/**
 * The sector this industry belongs to, or undefined when the pair does not exist. Used to
 * reject a chain someone assembled by hand: an industry from another sector is not simply
 * ignored, it is refused.
 */
export function industryInSector(sectorSlug: string, industrySlug: string): Industry | undefined {
  return findSector(sectorSlug)?.industries.find((industry) => industry.slug === industrySlug);
}

export function subIndustryInIndustry(
  industry: Industry,
  subIndustrySlug: string,
): SubIndustry | undefined {
  return industry.subIndustries.find((sub) => sub.slug === subIndustrySlug);
}

/** Every business type inside an industry, de-duplicated, for a summary chip list. */
export function industryBusinessTypes(industry: Industry): string[] {
  return [...new Set(industry.subIndustries.flatMap((sub) => sub.businessTypes))];
}

/** The sector whose whole purpose is "my business is not in your list" (section 33). */
export const CUSTOM_SECTOR_SLUG = 'other-custom';

export const TAXONOMY_COUNTS = {
  sectors: SECTORS.length,
  industries: ALL_INDUSTRIES.length,
  subIndustries: ALL_INDUSTRIES.reduce((total, industry) => total + industry.subIndustries.length, 0),
} as const;

// Section 34 business models and section 35 size bands live in ./profile — they describe
// how a business operates, not where it sits in the industry tree.
