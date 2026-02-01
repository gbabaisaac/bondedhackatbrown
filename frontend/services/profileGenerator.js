/**
 * Profile Generator Service
 * Generates realistic college student profiles with majors, interests, bios, etc.
 */

// Comprehensive list of college majors
const MAJORS = [
  'Computer Science', 'Business Administration', 'Psychology', 'Biology',
  'Engineering', 'Marketing', 'Communications', 'Economics', 'English',
  'Political Science', 'Sociology', 'Chemistry', 'Mathematics', 'History',
  'Art & Design', 'Music', 'Theater', 'Journalism', 'Education',
  'Nursing', 'Pre-Med', 'Pre-Law', 'Environmental Science', 'Physics',
  'Philosophy', 'Anthropology', 'International Relations', 'Finance',
  'Accounting', 'Information Systems', 'Data Science', 'Cybersecurity',
  'Graphic Design', 'Film Studies', 'Sports Management', 'Public Health',
  'Social Work', 'Criminal Justice', 'Architecture', 'Urban Planning'
]

// Realistic first names (diverse)
const FIRST_NAMES = [
  'Alex', 'Jordan', 'Taylor', 'Riley', 'Casey', 'Morgan', 'Sam', 'Jamie',
  'Quinn', 'Avery', 'Blake', 'Cameron', 'Dakota', 'Emery', 'Finley',
  'Harper', 'Hayden', 'Kai', 'Logan', 'Noah', 'Parker', 'Reese', 'River',
  'Sage', 'Emma', 'Olivia', 'Sophia', 'Isabella', 'Mia', 'Charlotte',
  'Amelia', 'Harper', 'Evelyn', 'Abigail', 'Emily', 'Elizabeth', 'Mila',
  'Ella', 'Avery', 'Sofia', 'Camila', 'Aria', 'Scarlett', 'Victoria',
  'Madison', 'Luna', 'Grace', 'Chloe', 'Penelope', 'Layla', 'Riley',
  'Zoey', 'Nora', 'Lily', 'Eleanor', 'Hannah', 'Lillian', 'Addison',
  'Aubrey', 'Ellie', 'Stella', 'Natalie', 'Zoe', 'Leah', 'Hazel',
  'Violet', 'Aurora', 'Savannah', 'Audrey', 'Brooklyn', 'Bella',
  'Claire', 'Skylar', 'Lucy', 'Paisley', 'Everly', 'Anna', 'Caroline',
  'Nova', 'Genesis', 'Aaliyah', 'Kennedy', 'Kinsley', 'Allison', 'Maya',
  'Sarah', 'Madelyn', 'Adeline', 'Alexa', 'Ariana', 'Elena', 'Gabriella',
  'Naomi', 'Alice', 'Samantha', 'Hailey', 'Eva', 'Emilia', 'Autumn',
  'Quinn', 'Nevaeh', 'Piper', 'Ruby', 'Serenity', 'Willow', 'Everleigh',
  'Cora', 'Kaylee', 'Lydia', 'Aubree', 'Arianna', 'Eliana', 'Peyton',
  'Melanie', 'Gianna', 'Isabelle', 'Julia', 'Valentina', 'Clara',
  'James', 'Michael', 'William', 'David', 'Richard', 'Joseph', 'Thomas',
  'Christopher', 'Daniel', 'Matthew', 'Anthony', 'Mark', 'Donald',
  'Steven', 'Paul', 'Andrew', 'Joshua', 'Kenneth', 'Kevin', 'Brian',
  'George', 'Timothy', 'Ronald', 'Jason', 'Edward', 'Jeffrey', 'Ryan',
  'Jacob', 'Gary', 'Nicholas', 'Eric', 'Jonathan', 'Stephen', 'Larry',
  'Justin', 'Scott', 'Brandon', 'Benjamin', 'Samuel', 'Gregory', 'Frank',
  'Raymond', 'Alexander', 'Patrick', 'Jack', 'Dennis', 'Jerry', 'Tyler',
  'Aaron', 'Jose', 'Henry', 'Adam', 'Douglas', 'Nathan', 'Zachary',
  'Kyle', 'Noah', 'Ethan', 'Jeremy', 'Walter', 'Christian', 'Keith',
  'Roger', 'Terry', 'Austin', 'Sean', 'Gerald', 'Carl', 'Harold',
  'Dylan', 'Arthur', 'Lawrence', 'Jordan', 'Jesse', 'Bryan', 'Billy',
  'Bruce', 'Gabriel', 'Joe', 'Logan', 'Alan', 'Juan', 'Wayne', 'Roy',
  'Ralph', 'Randy', 'Eugene', 'Vincent', 'Russell', 'Louis', 'Philip',
  'Bobby', 'Johnny', 'Bradley'
]

// Last names
const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller',
  'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Wilson',
  'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee',
  'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis',
  'Robinson', 'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott',
  'Torres', 'Nguyen', 'Hill', 'Flores', 'Green', 'Adams', 'Nelson',
  'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts',
  'Gomez', 'Phillips', 'Evans', 'Turner', 'Diaz', 'Parker', 'Cruz',
  'Edwards', 'Collins', 'Reyes', 'Stewart', 'Morris', 'Morales', 'Murphy',
  'Cook', 'Rogers', 'Gutierrez', 'Ortiz', 'Morgan', 'Cooper', 'Peterson',
  'Bailey', 'Reed', 'Kelly', 'Howard', 'Ramos', 'Kim', 'Cox', 'Ward',
  'Richardson', 'Watson', 'Brooks', 'Chavez', 'Wood', 'James', 'Bennett',
  'Gray', 'Mendoza', 'Ruiz', 'Hughes', 'Price', 'Alvarez', 'Castillo',
  'Sanders', 'Patel', 'Myers', 'Long', 'Ross', 'Foster', 'Jimenez'
]

// Realistic college quotes/bios
const QUOTES = [
  "Making memories, one day at a time.",
  "Living my best college life!",
  "Finding my people on campus.",
  "Dream big, work hard, stay humble.",
  "Creating my own path.",
  "Here for the vibes and the grades.",
  "Building the future, one class at a time.",
  "Coffee, classes, and good times.",
  "Making every moment count.",
  "Chasing dreams and making memories.",
  "Here to learn, grow, and connect.",
  "Living authentically, one day at a time.",
  "Building bridges, not walls.",
  "Making my mark, one step at a time.",
  "Here for the journey, not just the destination.",
  "Creating my story, one chapter at a time.",
  "Living life with purpose and passion.",
  "Making waves, not ripples.",
  "Here to make a difference.",
  "Building a life I'm proud of.",
  "CS major by day, coffee enthusiast by night ☕",
  "Always down for a study session or spontaneous adventure",
  "Passionate about [major] and making connections",
  "Love exploring campus and finding new study spots",
  "Here to learn, grow, and have fun along the way",
  "Looking for study buddies and good vibes",
  "Majoring in [major] and minoring in good times",
  "Coffee addict, bookworm, adventure seeker",
  "Trying to balance classes, clubs, and a social life",
  "Here to make the most of my college experience"
]

// Comprehensive interests list
const INTERESTS = [
  'Photography', 'Music', 'Reading', 'Gaming', 'Cooking', 'Travel',
  'Fitness', 'Yoga', 'Meditation', 'Art', 'Drawing', 'Painting',
  'Writing', 'Blogging', 'Podcasts', 'Movies', 'TV Shows', 'Netflix',
  'Hiking', 'Camping', 'Outdoor Adventures', 'Running', 'Cycling',
  'Basketball', 'Soccer', 'Tennis', 'Volleyball', 'Swimming', 'Dancing',
  'Singing', 'Playing Guitar', 'Playing Piano', 'DJing', 'Concerts',
  'Festivals', 'Parties', 'Social Events', 'Volunteering', 'Activism',
  'Politics', 'Debate', 'Public Speaking', 'Entrepreneurship', 'Startups',
  'Technology', 'Coding', 'Web Development', 'App Development', 'AI/ML',
  'Data Science', 'Design', 'Fashion', 'Style', 'Makeup', 'Skincare',
  'Fitness', 'Gym', 'Weightlifting', 'CrossFit', 'Marathons', 'Triathlons',
  'Food', 'Restaurants', 'Foodie', 'Coffee', 'Tea', 'Wine', 'Cocktails',
  'Cooking', 'Baking', 'Meal Prep', 'Vegan', 'Vegetarian', 'Keto',
  'Travel', 'Backpacking', 'Solo Travel', 'Road Trips', 'International',
  'Languages', 'Learning Spanish', 'Learning French', 'Learning Japanese',
  'Study Groups', 'Tutoring', 'Mentoring', 'Research', 'Internships',
  'Networking', 'Career Development', 'Leadership', 'Student Government',
  'Clubs', 'Fraternity', 'Sorority', 'Greek Life', 'Honor Societies',
  'Sports Teams', 'Intramurals', 'Recreation', 'Intramural Sports',
  'Gaming', 'Video Games', 'Board Games', 'Card Games', 'Esports',
  'Streaming', 'Content Creation', 'YouTube', 'TikTok', 'Instagram',
  'Social Media', 'Influencing', 'Blogging', 'Vlogging'
]

// Personality traits for realistic profiles
const PERSONALITY_TRAITS = [
  'Outgoing', 'Introverted', 'Adventurous', 'Thoughtful', 'Creative',
  'Analytical', 'Empathetic', 'Driven', 'Relaxed', 'Organized',
  'Spontaneous', 'Loyal', 'Independent', 'Collaborative', 'Optimistic',
  'Realistic', 'Humor', 'Witty', 'Serious', 'Playful'
]

/**
 * Generate a realistic college student profile
 * @param {number} index - Index for unique generation
 * @param {Function} getPhotoUrl - Function to get photo URL
 * @returns {Object} Profile object
 */
export const generateProfile = (index, getPhotoUrl) => {
  const gender = ['male', 'female', 'non-binary'][index % 3]
  const grade = ['Freshman', 'Sophomore', 'Junior', 'Senior'][index % 4]
  const year = ['2025', '2024', '2023', '2022'][index % 4]
  const age = [18, 19, 20, 21, 22, 23][index % 6]
  const major = MAJORS[index % MAJORS.length]
  
  // Use index directly for better distribution
  // Mix with a simple hash-like function to ensure variety
  const firstNameIndex = index % FIRST_NAMES.length
  const lastNameIndex = (index * 7 + 13) % LAST_NAMES.length // Simple hash for better distribution
  const firstName = FIRST_NAMES[firstNameIndex]
  const lastName = LAST_NAMES[lastNameIndex]
  const name = `${firstName} ${lastName}`
  
  // Generate realistic interests (3-6 interests)
  const numInterests = Math.floor(Math.random() * 4) + 3
  const profileInterests = []
  const usedIndices = new Set()
  for (let i = 0; i < numInterests; i++) {
    let interestIndex
    do {
      interestIndex = Math.floor(Math.random() * INTERESTS.length)
    } while (usedIndices.has(interestIndex))
    usedIndices.add(interestIndex)
    profileInterests.push(INTERESTS[interestIndex])
  }
  
  // Generate a realistic quote/bio
  let quote = QUOTES[index % QUOTES.length]
  if (quote.includes('[major]')) {
    quote = quote.replace('[major]', major)
  }
  
  // Generate personality tags (2-4 tags)
  const numTags = Math.floor(Math.random() * 3) + 2
  const personalityTags = []
  const usedTagIndices = new Set()
  for (let i = 0; i < numTags; i++) {
    let tagIndex
    do {
      tagIndex = Math.floor(Math.random() * PERSONALITY_TRAITS.length)
    } while (usedTagIndices.has(tagIndex))
    usedTagIndices.add(tagIndex)
    personalityTags.push(PERSONALITY_TRAITS[tagIndex])
  }
  
  // Generate GroupJam score (realistic range: 60-98)
  const groupjamScore = Math.floor(Math.random() * 38) + 60
  
  // Get photo URL (using seed for consistency)
  const photoSeed = `profile-${index}`
  const photoUrl = getPhotoUrl(400, 400, photoSeed)
  
  return {
    id: `user-${index + 1}`,
    name,
    firstName,
    lastName,
    major,
    year,
    grade,
    gender,
    age,
    quote,
    photoUrl,
    interests: profileInterests,
    personalityTags,
    groupjamScore,
    handle: `@${firstName.toLowerCase()}${lastName.toLowerCase().slice(0, 4)}${index % 10}`,
    location: 'University of Rhode Island',
    school: 'University of Rhode Island',
  }
}

/**
 * Generate multiple profiles
 * @param {number} count - Number of profiles to generate
 * @param {Function} getPhotoUrl - Function to get photo URL
 * @returns {Array} Array of profile objects
 */
export const generateProfiles = (count = 200, getPhotoUrl) => {
  return Array.from({ length: count }, (_, index) => 
    generateProfile(index, getPhotoUrl)
  )
}

