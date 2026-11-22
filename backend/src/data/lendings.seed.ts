import type { LendingStatus } from '../../../shared/library';

export interface InitialLendingSeed {
  borrowerName: string;
  borrowerPhone: string;
  daysOffsetFromNow: number;
  lentDaysAgo: number;
  status: LendingStatus;
  bookTitles: Array<{ title: string; quantity: number }>;
}

export const INITIAL_LENDINGS: InitialLendingSeed[] = [
  {
    borrowerName: 'Nadia Pratama',
    borrowerPhone: '+62 813-4820-1190',
    daysOffsetFromNow: 9,
    lentDaysAgo: 5,
    status: 'Active',
    bookTitles: [
      { title: 'Pachinko', quantity: 1 },
      { title: 'Atomic Habits', quantity: 1 },
    ],
  },
  {
    borrowerName: 'Daniel Tan',
    borrowerPhone: '+62 812-9045-3318',
    daysOffsetFromNow: 4,
    lentDaysAgo: 10,
    status: 'Active',
    bookTitles: [
      { title: 'Clean Code', quantity: 1 },
      { title: 'The Pragmatic Programmer', quantity: 1 },
    ],
  },
  {
    borrowerName: 'Siti Rahmawati',
    borrowerPhone: '+62 815-7721-6042',
    daysOffsetFromNow: -3,
    lentDaysAgo: 17,
    status: 'Returned',
    bookTitles: [{ title: 'The Little Prince', quantity: 2 }],
  },
];
