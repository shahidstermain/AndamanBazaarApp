import { db } from '../src/lib/firebase';
import { collection, doc, setDoc } from 'firebase/firestore';

const sampleActivities = [
  {
    id: 'hvl-scuba-1',
    title: 'Discover Scuba Diving at Nemo Reef',
    island: 'Havelock',
    type: 'Scuba Diving',
    price: 4500,
    durationMinutes: 120,
    difficulty: 'Easy',
    familyFriendly: true,
    requiresSwimming: false,
    season: ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May'],
    rating: 4.9,
    reviewCount: 128,
    location: { lat: 12.0345, lng: 92.9876 }
  },
  {
    id: 'pb-jail-1',
    title: 'Cellular Jail Light & Sound Show',
    island: 'Port Blair',
    type: 'History',
    price: 300,
    durationMinutes: 90,
    difficulty: 'Easy',
    familyFriendly: true,
    requiresSwimming: false,
    season: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    rating: 4.7,
    reviewCount: 540,
    location: { lat: 11.6741, lng: 92.7486 }
  },
  {
    id: 'nl-snork-1',
    title: 'Snorkeling at Bharatpur Beach',
    island: 'Neil Island',
    type: 'Snorkeling',
    price: 1500,
    durationMinutes: 60,
    difficulty: 'Medium',
    familyFriendly: true,
    requiresSwimming: true,
    season: ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr'],
    rating: 4.8,
    reviewCount: 89,
    location: { lat: 11.8342, lng: 93.0543 }
  },
  {
    id: 'br-caves-1',
    title: 'Limestone Caves Exploration',
    island: 'Baratang',
    type: 'Trekking',
    price: 2500,
    durationMinutes: 240,
    difficulty: 'Hard',
    familyFriendly: false,
    requiresSwimming: false,
    season: ['Nov', 'Dec', 'Jan', 'Feb', 'Mar'],
    rating: 4.5,
    reviewCount: 42,
    location: { lat: 12.1234, lng: 92.7890 }
  }
];

export const seedActivities = async () => {
  for (const activity of sampleActivities) {
    await setDoc(doc(collection(db, 'activities'), activity.id), activity);
  }
  console.log('Successfully seeded activities!');
};
