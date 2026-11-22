export type Locale = 'en' | 'id';

export interface TranslationDictionary {
  meta: {
    brandFull: string;
    brandShort: string;
    skipToContent: string;
    headLibrarian: string;
  };
  language: {
    label: string;
    switchToEn: string;
    switchToId: string;
  };
  theme: {
    lightMode: string;
    darkMode: string;
    lightShort: string;
    darkShort: string;
    switchToLight: string;
    switchToDark: string;
  };
  nav: {
    libraryNavigation: string;
    mobileNavigation: string;
    breadcrumb: string;
    catalog: string;
    catalogShort: string;
    lend: string;
    lendShort: string;
    history: string;
    historyShort: string;
    addBook: string;
    addShort: string;
    profileShort: string;
    signOut: string;
  };
  auth: {
    connectingTitle: string;
    connectingSubtitle: string;
    connectDbTitle: string;
    connectDbSubtitle: string;
    connectStep1Prefix: string;
    connectStep1Middle: string;
    connectStep1Suffix: string;
    connectStep2Prefix: string;
    connectStep2Middle: string;
    connectStep2Suffix: string;
    connectStep3: string;
    retryConnection: string;
    firstTimeBadge: string;
    setupTitle: string;
    setupSubtitle: string;
    librarianName: string;
    emailAddress: string;
    createPassword: string;
    createPasswordPlaceholder: string;
    confirmPassword: string;
    confirmPasswordPlaceholder: string;
    showPassword: string;
    hidePassword: string;
    creatingAccount: string;
    saveAccountAndEnter: string;
    loginTitle: string;
    loginSubtitle: string;
    password: string;
    passwordPlaceholder: string;
    signingIn: string;
    signIn: string;
    setupTokenLabel: string;
    setupTokenPlaceholder: string;
    errPasswordShort: string;
    errPasswordMismatch: string;
    errEmailPasswordRequired: string;
    errSetupTokenRequired: string;
    errors: {
      sessionExpired: string;
      sessionChanged: string;
      logoutUnconfirmed: string;
      setupFailed: string;
      loginFailed: string;
      passwordChangeFailed: string;
      genericRequestFailed: string;
      invalidServerResponse: string;
      dbNotConnected: string;
      serverUnreachable: string;
    };
  };
  accountPassword: {
    openProfileAria: string;
    profileHint: string;
    modalTitle: string;
    modalSubtitle: string;
    envManagedTitle: string;
    envManagedBody: string;
    currentPassword: string;
    currentPasswordPlaceholder: string;
    newPassword: string;
    newPasswordPlaceholder: string;
    confirmNewPassword: string;
    confirmNewPasswordPlaceholder: string;
    saving: string;
    savePassword: string;
    cancel: string;
    close: string;
    errCurrentRequired: string;
    errNewShort: string;
    errNewTooLong: string;
    errSameAsCurrent: string;
    errConfirmMismatch: string;
  };
  catalog: {
    heading: string;
    subheading: string;
    collectionSummary: string;
    totalTitles: string;
    copiesOnShelf: string;
    activeLoans: string;
    viewActive: string;
    copiesCheckedOut: (count: number) => string;
    runningLowLabel: string;
    filtered: string;
    filterList: string;
    filtersAriaLabel: string;
    searchLabel: string;
    searchPlaceholder: string;
    clearSearch: string;
    genreLabel: string;
    allGenres: string;
    searchGenrePlaceholder: string;
    noGenresFound: string;
    sortByLabel: string;
    sortTitleAsc: string;
    sortTitleDesc: string;
    sortStockDesc: string;
    sortStockAsc: string;
    clearAllFilters: string;
    emptyShelfTitle: string;
    emptyShelfBody: string;
    addFirstBook: string;
    noMatchesTitle: string;
    noMatchesBody: string;
    statusAvailable: string;
    statusAvailableDetail: string;
    statusLow: string;
    statusOut: string;
    colTitleAuthor: string;
    colGenre: string;
    colYearIsbn: string;
    colStock: string;
    colActions: string;
    lendAction: string;
    editAction: string;
    viewDetailsAria: (title: string) => string;
    lendBookAria: (title: string) => string;
    editBookAria: (title: string) => string;
    summaryLine: (params: {
      count: number;
      genre: string | null;
      lowOnly: boolean;
      sortText: string;
    }) => string;
    sortSummary: {
      titleAsc: string;
      titleDesc: string;
      stockDesc: string;
      stockAsc: string;
    };
  };
  lending: {
    heading: string;
    subheading: string;
    selectedBooksAria: string;
    selectedBooksTitle: string;
    clearAll: string;
    emptyDraftBody: string;
    onShelfLeftAfter: (stock: number, remaining: number) => string;
    decreaseQtyAria: (title: string) => string;
    increaseQtyAria: (title: string) => string;
    removeFromListAria: (title: string) => string;
    availableOnShelf: string;
    findBookLabel: string;
    findBookPlaceholder: string;
    clearBookSearch: string;
    filterGenreAria: string;
    noSearchMatches: string;
    onShelfCount: (stock: number) => string;
    addToLendingAria: (title: string) => string;
    outOfStock: string;
    addAnother: string;
    add: string;
    borrowerDetails: string;
    borrowerSubtitle: string;
    borrowerName: string;
    borrowerNamePlaceholder: string;
    phoneNumber: string;
    phonePlaceholder: string;
    dueDate: string;
    selectDueDate: string;
    distinctTitles: string;
    totalCopiesToLend: string;
    preparingSummary: string;
    reviewCheckout: string;
    quickJumpSummary: (titles: number, copies: number) => string;
    previewFailedFallback: string;
    loadingLabel: string;
    draftOutOfSync: string;
  };
  history: {
    heading: string;
    subheading: string;
    newCheckout: string;
    filterStatusAria: string;
    statusAll: string;
    statusActive: string;
    statusReturned: string;
    searchLabel: string;
    searchPlaceholder: string;
    clearSearch: string;
    emptyTitle: string;
    emptyBody: string;
    startCheckout: string;
    noMatchesTitle: string;
    noMatchesBody: string;
    duePrefix: string;
    overdue: string;
    confirmReturn: string;
    confirmReturnAria: (refCode: string) => string;
    returnBooks: string;
    returnBooksAria: (refCode: string) => string;
    cancel: string;
    colRefDate: string;
    colBorrower: string;
    colBooksLent: string;
    colCopies: string;
    colDueDate: string;
    colStatusAction: string;
  };
  bookDetail: {
    kicker: string;
    closeAria: string;
    shelfStock: string;
    copyUnit: (count: number) => string;
    shelfLocation: string;
    notSet: string;
    unassigned: string;
    copiesOutOnLoan: (count: number) => string;
    noCopiesOut: string;
    aboutBook: string;
    noSynopsis: string;
    bibliographicAria: string;
    catalogInfo: string;
    genre: string;
    publishedYear: string;
    isbn: string;
    publisher: string;
    pages: string;
    pagesValue: (count: number) => string;
    language: string;
    lastUpdated: string;
    activeLoansAria: string;
    currentlyCheckedOut: (count: number) => string;
    removeZoneAria: string;
    removeZoneTitle: string;
    removeZoneBody: string;
    removeBook: string;
    editDetails: string;
    lendBook: string;
    outOfStock: string;
  };
  bookForm: {
    editTitle: string;
    addTitle: string;
    editSubtitle: string;
    addSubtitle: string;
    closeAria: (title: string) => string;
    coverPhotoLabel: string;
    coverPhotoHint: string;
    processingPhoto: string;
    replacePhoto: string;
    uploadPhoto: string;
    removePhoto: string;
    coverUrlAria: string;
    coverUrlPlaceholder: string;
    uploadedPhotoReady: string;
    currentPhotoActive: string;
    photoProcessError: string;
    photoErrors: {
      unsupportedType: string;
      fileTooLarge: string;
      invalidImage: string;
      dimensionsTooLarge: string;
      encodingFailed: string;
      tooLargeAfterCompression: string;
    };
    bookTitle: string;
    bookTitlePlaceholder: string;
    author: string;
    authorPlaceholder: string;
    genre: string;
    customGenreOption: string;
    customGenreAria: string;
    customGenrePlaceholder: string;
    copiesOnShelf: string;
    decreaseStockAria: string;
    increaseStockAria: string;
    publishedYear: string;
    publishedYearPlaceholder: string;
    isbn: string;
    isbnPlaceholder: string;
    publisher: string;
    publisherPlaceholder: string;
    pages: string;
    pagesPlaceholder: string;
    shelfLocation: string;
    shelfLocationPlaceholder: string;
    language: string;
    languagePlaceholder: string;
    synopsis: string;
    synopsisPlaceholder: string;
    cancel: string;
    saving: string;
    saveChanges: string;
    saveBook: string;
    saveFailedFallback: string;
    defaultCoverTitle: string;
  };
  confirmDelete: {
    title: (bookTitle: string) => string;
    bodyBefore: string;
    bodyAfter: (stock: number) => string;
    cancel: string;
    removing: string;
    removeTitle: string;
  };
  lendingSummary: {
    title: string;
    subtitle: string;
    closeAria: string;
    borrower: string;
    phoneNumber: string;
    dueDate: string;
    booksIncluded: (titles: number, copies: number) => string;
    colBookTitle: string;
    colQty: string;
    colShelfStock: string;
    disclaimer: string;
    editDetails: string;
    confirming: string;
    confirmCheckout: string;
  };
  calendar: {
    previousMonth: string;
    nextMonth: string;
    today: string;
    preset7Days: string;
    preset14Days: string;
    preset30Days: string;
    chooseDate: string;
    dialogLabel: string;
  };
  toast: {
    dismissAria: string;
    loadCatalogError: string;
    refreshError: string;
    bookAdded: (title: string, stock: number) => string;
    bookUpdated: (title: string) => string;
    bookRemoved: (title: string) => string;
    removeBookError: string;
    checkoutConfirmed: (copies: number, borrower: string, refCode: string) => string;
    checkoutError: string;
    booksReturned: (refCode: string, copies: number) => string;
    returnError: string;
    passwordChanged: string;
  };
  validation: {
    titleRequired: string;
    titleTooLong: string;
    authorRequired: string;
    authorTooLong: string;
    genreRequired: string;
    genreTooLong: string;
    stockInvalid: string;
    yearInvalid: (maxYear: number) => string;
    pagesInvalid: string;
    isbnTooLong: string;
    publisherTooLong: string;
    shelfTooLong: string;
    languageTooLong: string;
    descriptionTooLong: string;
    coverInvalid: string;
    borrowerNameShort: string;
    borrowerNameTooLong: string;
    phoneInvalid: string;
    dueDateInvalid: string;
    itemsEmpty: string;
    itemMissing: string;
    itemQtyMin: (title: string) => string;
    itemQtyExceeds: (stock: number, title: string) => string;
  };
  errorBoundary: {
    title: string;
    message: string;
    reload: string;
  };
}

export const TRANSLATIONS: Record<Locale, TranslationDictionary> = {
  en: {
    meta: {
      brandFull: "Mei's Community Library",
      brandShort: "Mei's Library",
      skipToContent: 'Skip to main content',
      headLibrarian: 'Head Librarian',
    },
    language: {
      label: 'Language',
      switchToEn: 'Switch language to English',
      switchToId: 'Switch language to Indonesian',
    },
    theme: {
      lightMode: 'Light mode',
      darkMode: 'Dark mode',
      lightShort: 'Light',
      darkShort: 'Dark',
      switchToLight: 'Switch to light mode',
      switchToDark: 'Switch to dark mode',
    },
    nav: {
      libraryNavigation: 'Library navigation',
      mobileNavigation: 'Mobile library navigation',
      breadcrumb: 'Breadcrumb',
      catalog: 'Book Catalog',
      catalogShort: 'Catalog',
      lend: 'Lend Books',
      lendShort: 'Lend',
      history: 'Lending History',
      historyShort: 'History',
      addBook: 'Add Book',
      addShort: 'Add',
      profileShort: 'Profile',
      signOut: 'Sign out',
    },
    auth: {
      connectingTitle: 'Opening the Library Desk',
      connectingSubtitle: 'Checking MongoDB connection and your librarian session...',
      connectDbTitle: 'Connect MongoDB Atlas',
      connectDbSubtitle:
        'Every book, checkout record, and librarian account lives directly in MongoDB.',
      connectStep1Prefix: 'Add',
      connectStep1Middle: 'in',
      connectStep1Suffix: 'and click Apply.',
      connectStep2Prefix: 'In MongoDB Atlas →',
      connectStep2Middle: ', allow only your server or deployment IP range (avoid',
      connectStep2Suffix: 'in production).',
      connectStep3:
        'Once connected, you can add books directly or run npm run seed from the server to load starter books.',
      retryConnection: 'Retry MongoDB Connection',
      firstTimeBadge: 'First-Time Setup',
      setupTitle: 'Set Up Head Librarian Account',
      setupSubtitle:
        'Pick a password to protect your catalog. This one-time setup locks automatically once saved to MongoDB.',
      librarianName: 'Librarian Name',
      emailAddress: 'Email Address',
      createPassword: 'Create Password (min. 8 characters)',
      createPasswordPlaceholder: 'Choose a strong password',
      confirmPassword: 'Confirm Password',
      confirmPasswordPlaceholder: 'Type your password again',
      showPassword: 'Show password',
      hidePassword: 'Hide password',
      creatingAccount: 'Setting up account...',
      saveAccountAndEnter: 'Save Account & Open Library',
      loginTitle: "Welcome back to Mei's Library",
      loginSubtitle: 'Sign in with your librarian account to manage books and loans.',
      password: 'Password',
      passwordPlaceholder: 'Enter your password',
      signingIn: 'Signing in...',
      signIn: 'Sign In',
      setupTokenLabel: 'Setup Token',
      setupTokenPlaceholder: 'Enter the server SETUP_TOKEN',
      errPasswordShort: 'Please use at least 8 characters for your password.',
      errPasswordMismatch: 'Both passwords need to match.',
      errEmailPasswordRequired: 'Please enter both your email and password.',
      errSetupTokenRequired: 'Please enter the server setup token.',
      errors: {
        sessionExpired: 'Your session expired. Please sign in again.',
        sessionChanged: 'Your session has changed.',
        logoutUnconfirmed:
          'Signed out locally, but the server session may still be active. Reloading may restore it.',
        setupFailed: 'Could not complete account setup. Please try again.',
        loginFailed: 'Sign-in failed. Please try again.',
        passwordChangeFailed: 'Could not update password. Please try again.',
        genericRequestFailed: 'Request failed. Please try again.',
        invalidServerResponse: 'Received an invalid response from the server.',
        dbNotConnected:
          'MongoDB is not connected yet. Set MONGODB_URI in your .env file or server environment.',
        serverUnreachable: 'Could not reach the library API server. Please try again.',
      },
    },
    accountPassword: {
      openProfileAria: 'Open librarian account and change password',
      profileHint: 'Change password',
      modalTitle: 'Librarian Account',
      modalSubtitle:
        'Update your sign-in password. Other active sessions will be signed out.',
      envManagedTitle: 'Password managed by server configuration',
      envManagedBody:
        'This librarian account uses the LIBRARIAN_PASSWORD environment variable. Update it in your server environment and restart the backend to change the password.',
      currentPassword: 'Current Password',
      currentPasswordPlaceholder: 'Enter your current password',
      newPassword: 'New Password (min. 8 characters)',
      newPasswordPlaceholder: 'Choose a new strong password',
      confirmNewPassword: 'Confirm New Password',
      confirmNewPasswordPlaceholder: 'Type the new password again',
      saving: 'Updating password...',
      savePassword: 'Update Password',
      cancel: 'Cancel',
      close: 'Close',
      errCurrentRequired: 'Please enter your current password.',
      errNewShort: 'New password must be at least 8 characters.',
      errNewTooLong: 'New password must be 128 characters or fewer.',
      errSameAsCurrent: 'New password must be different from your current password.',
      errConfirmMismatch: 'New password confirmation does not match.',
    },
    catalog: {
      heading: 'Book Catalog',
      subheading: 'Browse the shelves, check copies on hand, or start a checkout.',
      collectionSummary: 'Collection summary',
      totalTitles: 'Total Titles',
      copiesOnShelf: 'Copies on Shelf',
      activeLoans: 'Active Loans',
      viewActive: 'View active →',
      copiesCheckedOut: (count) =>
        `${count} ${count === 1 ? 'copy' : 'copies'} out on loan`,
      runningLowLabel: 'Running Low (≤ 2)',
      filtered: 'Filtered',
      filterList: 'Filter list',
      filtersAriaLabel: 'Catalog filters and sorting',
      searchLabel: 'Search title, author, or ISBN',
      searchPlaceholder: 'Search title, author, or ISBN...',
      clearSearch: 'Clear search',
      genreLabel: 'Genre',
      allGenres: 'All Genres',
      searchGenrePlaceholder: 'Filter genres...',
      noGenresFound: 'No matching genres',
      sortByLabel: 'Sort by',
      sortTitleAsc: 'Title: A to Z',
      sortTitleDesc: 'Title: Z to A',
      sortStockDesc: 'Stock: Most first',
      sortStockAsc: 'Stock: Fewest first',
      clearAllFilters: 'Reset Filters',
      emptyShelfTitle: 'No books on the shelves yet',
      emptyShelfBody:
        'Add your first title to start tracking copies and lending books to readers.',
      addFirstBook: 'Add First Book',
      noMatchesTitle: 'No matching books found',
      noMatchesBody: 'Try another genre, keyword, or reset your active filters.',
      statusAvailable: 'Available',
      statusAvailableDetail: 'Available on shelf',
      statusLow: 'Running low',
      statusOut: 'Out of stock',
      colTitleAuthor: 'Title & Author',
      colGenre: 'Genre',
      colYearIsbn: 'Year / ISBN',
      colStock: 'Stock',
      colActions: 'Actions',
      lendAction: 'Lend',
      editAction: 'Edit',
      viewDetailsAria: (title) => `View details for ${title}`,
      lendBookAria: (title) => `Lend ${title}`,
      editBookAria: (title) => `Edit ${title}`,
      summaryLine: ({ count, genre, lowOnly, sortText }) =>
        `Showing ${count} ${count === 1 ? 'book' : 'books'}${
          genre ? ` in ${genre}` : ''
        }${lowOnly ? ' · running low (≤ 2)' : ''} · sorted by ${sortText}.`,
      sortSummary: {
        titleAsc: 'title (A–Z)',
        titleDesc: 'title (Z–A)',
        stockDesc: 'stock (most first)',
        stockAsc: 'stock (fewest first)',
      },
    },
    lending: {
      heading: 'Lend Books',
      subheading:
        'Pick titles, adjust quantities, and review the checkout summary before confirming.',
      selectedBooksAria: 'Selected books to lend',
      selectedBooksTitle: 'Selected Books',
      clearAll: 'Clear All',
      emptyDraftBody:
        'Your checkout basket is empty. Pick one or more books from the shelf list below.',
      onShelfLeftAfter: (stock, remaining) =>
        `${stock} on shelf (${remaining} left after)`,
      decreaseQtyAria: (title) => `Decrease quantity for ${title}`,
      increaseQtyAria: (title) => `Increase quantity for ${title}`,
      removeFromListAria: (title) => `Remove ${title} from lending list`,
      availableOnShelf: 'Available on Shelf',
      findBookLabel: 'Find a book on shelf',
      findBookPlaceholder: 'Find a book...',
      clearBookSearch: 'Clear book search',
      filterGenreAria: 'Filter shelf books by genre',
      noSearchMatches: 'No books match your search right now.',
      onShelfCount: (stock) => `${stock} on shelf`,
      addToLendingAria: (title) => `Add ${title} to lending list`,
      outOfStock: 'Out of stock',
      addAnother: 'Add Another',
      add: 'Add',
      borrowerDetails: 'Borrower Details',
      borrowerSubtitle:
        "Who's taking these books home? You'll review everything before confirming.",
      borrowerName: "Borrower's Name",
      borrowerNamePlaceholder: 'e.g., Rina Kusuma',
      phoneNumber: 'Phone Number',
      phonePlaceholder: 'e.g., +62 812-3456-7890',
      dueDate: 'Due Date',
      selectDueDate: 'Choose a due date',
      distinctTitles: 'Distinct Titles',
      totalCopiesToLend: 'Total Copies to Lend',
      preparingSummary: 'Preparing summary...',
      reviewCheckout: 'Review Checkout',
      quickJumpSummary: (titles, copies) =>
        `${titles} ${titles === 1 ? 'title' : 'titles'} · ${copies} ${
          copies === 1 ? 'copy' : 'copies'
        }`,
      previewFailedFallback: 'Could not prepare the checkout summary. Please try again.',
      loadingLabel: 'Loading lending desk',
      draftOutOfSync: 'Selected items changed. Please review your checkout again.',
    },
    history: {
      heading: 'Lending History',
      subheading: 'Keep track of active checkouts, due dates, and returned books.',
      newCheckout: 'New Checkout',
      filterStatusAria: 'Filter lending status',
      statusAll: 'All',
      statusActive: 'Active',
      statusReturned: 'Returned',
      searchLabel: 'Search borrower, phone, ref, or title',
      searchPlaceholder: 'Search borrower, phone, ref, or title...',
      clearSearch: 'Clear history search',
      emptyTitle: 'No checkouts recorded yet',
      emptyBody:
        'Confirmed checkouts will appear here with due dates and quick return buttons.',
      startCheckout: 'Start a Checkout',
      noMatchesTitle: 'No matching checkouts',
      noMatchesBody: 'Try switching the status tab or clearing your search.',
      duePrefix: 'Due',
      overdue: 'Overdue',
      confirmReturn: 'Confirm Return',
      confirmReturnAria: (refCode) => `Confirm return for ${refCode}`,
      returnBooks: 'Return Books',
      returnBooksAria: (refCode) => `Return books for ${refCode}`,
      cancel: 'Cancel',
      colRefDate: 'Reference & Date',
      colBorrower: 'Borrower',
      colBooksLent: 'Books Lent',
      colCopies: 'Copies',
      colDueDate: 'Due Date',
      colStatusAction: 'Status & Action',
    },
    bookDetail: {
      kicker: 'Book Details',
      closeAria: 'Close Book Details dialog',
      shelfStock: 'Shelf Stock',
      copyUnit: (count) => (count === 1 ? 'copy' : 'copies'),
      shelfLocation: 'Shelf Location',
      notSet: 'Not set yet',
      unassigned: 'Unassigned',
      copiesOutOnLoan: (count) =>
        `${count} ${count === 1 ? 'copy' : 'copies'} out on loan`,
      noCopiesOut: 'All copies currently in',
      aboutBook: 'About this book',
      noSynopsis:
        'No synopsis yet. Tap Edit Details to add a short summary or librarian notes.',
      bibliographicAria: 'Bibliographic details',
      catalogInfo: 'Catalog Information',
      genre: 'Genre',
      publishedYear: 'Published Year',
      isbn: 'ISBN',
      publisher: 'Publisher',
      pages: 'Pages',
      pagesValue: (count) => `${count} pages`,
      language: 'Language',
      lastUpdated: 'Last Updated',
      activeLoansAria: 'Active checkouts for this book',
      currentlyCheckedOut: (count) => `Currently Checked Out (${count})`,
      removeZoneAria: 'Remove book from catalog',
      removeZoneTitle: 'Remove from catalog',
      removeZoneBody:
        'Permanently remove this title from your shelves. Past lending records stay intact.',
      removeBook: 'Remove Book',
      editDetails: 'Edit Details',
      lendBook: 'Lend Book',
      outOfStock: 'Out of Stock',
    },
    bookForm: {
      editTitle: 'Edit Book Details',
      addTitle: 'Add a New Book',
      editSubtitle: 'Update the cover photo, catalog details, or copies on shelf.',
      addSubtitle: 'Add a cover photo, book details, and how many copies are on shelf.',
      closeAria: (title) => `Close ${title} dialog`,
      coverPhotoLabel: 'Book Cover Photo (optional)',
      coverPhotoHint: 'Upload a JPG, PNG, or WebP photo, or paste an image link below.',
      processingPhoto: 'Processing...',
      replacePhoto: 'Replace Photo',
      uploadPhoto: 'Upload Photo',
      removePhoto: 'Remove',
      coverUrlAria: 'Cover image URL',
      coverUrlPlaceholder: 'Or paste an image link (https://...)',
      uploadedPhotoReady: 'Uploaded photo is ready to save.',
      currentPhotoActive:
        'Current library cover is active. Upload or paste a link to replace it.',
      photoProcessError: 'Could not process that photo. Try a smaller JPG, PNG, or WebP.',
      photoErrors: {
        unsupportedType: 'Please choose a JPG, PNG, or WebP image.',
        fileTooLarge: 'Image file must be 5 MB or smaller.',
        invalidImage: 'The selected file is not a valid image.',
        dimensionsTooLarge:
          'Image dimensions are too large. Please choose a smaller photo.',
        encodingFailed: 'Unable to process the selected image.',
        tooLargeAfterCompression:
          'Compressed image is still too large. Please try a smaller photo.',
      },
      bookTitle: 'Book Title',
      bookTitlePlaceholder: 'e.g., The Midnight Library',
      author: 'Author',
      authorPlaceholder: 'e.g., Matt Haig',
      genre: 'Genre',
      customGenreOption: '+ Add custom genre...',
      customGenreAria: 'Custom genre name',
      customGenrePlaceholder: 'Type a new genre name',
      copiesOnShelf: 'Copies on Shelf',
      decreaseStockAria: 'Decrease copies on shelf',
      increaseStockAria: 'Increase copies on shelf',
      publishedYear: 'Published Year',
      publishedYearPlaceholder: 'e.g., 2020',
      isbn: 'ISBN',
      isbnPlaceholder: 'e.g., 978-0525559474',
      publisher: 'Publisher',
      publisherPlaceholder: 'e.g., Viking Press',
      pages: 'Pages',
      pagesPlaceholder: 'e.g., 304',
      shelfLocation: 'Shelf Location',
      shelfLocationPlaceholder: 'e.g., Aisle A · Shelf 2',
      language: 'Language',
      languagePlaceholder: 'e.g., English',
      synopsis: 'Synopsis / Notes',
      synopsisPlaceholder:
        'Add a quick summary or helpful librarian notes about this edition...',
      cancel: 'Cancel',
      saving: 'Saving...',
      saveChanges: 'Save Changes',
      saveBook: 'Save Book',
      saveFailedFallback: 'Could not save this book. Please try again.',
      defaultCoverTitle: 'Book Cover',
    },
    confirmDelete: {
      title: (bookTitle) => `Remove “${bookTitle}” from catalog?`,
      bodyBefore: 'This removes',
      bodyAfter: (stock) =>
        `(${stock} ${stock === 1 ? 'copy' : 'copies'} on shelf) from the catalog. Past checkout records stay safely in Lending History.`,
      cancel: 'Cancel',
      removing: 'Removing...',
      removeTitle: 'Remove Title',
    },
    lendingSummary: {
      title: 'Checkout Summary',
      subtitle: 'Give borrower details and shelf stock a quick look before confirming.',
      closeAria: 'Close checkout summary',
      borrower: 'Borrower',
      phoneNumber: 'Phone Number',
      dueDate: 'Due Date',
      booksIncluded: (titles, copies) =>
        `Books Included (${titles} ${titles === 1 ? 'title' : 'titles'} · ${copies} ${
          copies === 1 ? 'copy' : 'copies'
        })`,
      colBookTitle: 'Book Title',
      colQty: 'Qty',
      colShelfStock: 'Shelf Stock',
      disclaimer:
        'Confirming logs this loan in Lending History and updates shelf stock right away.',
      editDetails: 'Back & Edit',
      confirming: 'Confirming...',
      confirmCheckout: 'Confirm Checkout',
    },
    calendar: {
      previousMonth: 'Previous month',
      nextMonth: 'Next month',
      today: 'Today',
      preset7Days: '+7 days',
      preset14Days: '+14 days',
      preset30Days: '+30 days',
      chooseDate: 'Pick a date',
      dialogLabel: 'Due date calendar',
    },
    toast: {
      dismissAria: 'Dismiss notification',
      loadCatalogError: 'Unable to load the library catalog right now.',
      refreshError: 'Unable to refresh library data.',
      bookAdded: (title, stock) =>
        `Added "${title}" with ${stock} ${stock === 1 ? 'copy' : 'copies'} on shelf.`,
      bookUpdated: (title) => `Saved updates for "${title}".`,
      bookRemoved: (title) => `Removed "${title}" from the catalog.`,
      removeBookError: 'Could not remove that book.',
      checkoutConfirmed: (copies, borrower, refCode) =>
        `Checked out ${copies} ${copies === 1 ? 'copy' : 'copies'} to ${borrower} (${refCode}). Shelf stock updated.`,
      checkoutError: 'Could not confirm this checkout.',
      booksReturned: (refCode, copies) =>
        `Returned ${refCode} — ${copies} ${copies === 1 ? 'copy' : 'copies'} back on the shelf.`,
      returnError: 'Could not record the return.',
      passwordChanged: 'Password updated. Other active sessions have been signed out.',
    },
    validation: {
      titleRequired: 'Please enter the book title.',
      titleTooLong: 'Keep the book title under 180 characters.',
      authorRequired: "Please enter the author's name.",
      authorTooLong: "Keep the author's name under 120 characters.",
      genreRequired: 'Please choose or enter a genre.',
      genreTooLong: 'Keep the genre under 60 characters.',
      stockInvalid: 'Enter a whole number from 0 to 10,000.',
      yearInvalid: (maxYear) => `Enter a year between 1000 and ${maxYear}.`,
      pagesInvalid: 'Enter a page count between 1 and 20,000.',
      isbnTooLong: 'Keep the ISBN under 40 characters.',
      publisherTooLong: 'Keep the publisher name under 120 characters.',
      shelfTooLong: 'Keep the shelf location under 60 characters.',
      languageTooLong: 'Keep the language under 40 characters.',
      descriptionTooLong: 'Keep the synopsis under 1,200 characters.',
      coverInvalid: 'Use a valid http(s) image link or upload a JPG, PNG, or WebP photo.',
      borrowerNameShort: 'Borrower name needs at least 2 characters.',
      borrowerNameTooLong: 'Borrower name must be at most 120 characters.',
      phoneInvalid: 'Enter a valid phone number (7–15 digits).',
      dueDateInvalid: 'Please pick a valid due date.',
      itemsEmpty: 'Pick at least one book to lend first.',
      itemMissing: 'One of the selected books is no longer in the catalog.',
      itemQtyMin: (title) => `Quantity for "${title}" must be at least 1.`,
      itemQtyExceeds: (stock, title) =>
        `Only ${stock} ${stock === 1 ? 'copy' : 'copies'} available for "${title}".`,
    },
    errorBoundary: {
      title: 'Something went wrong',
      message:
        'An unexpected error occurred while displaying the library. Reload the page to recover.',
      reload: 'Reload Page',
    },
  },
  id: {
    meta: {
      brandFull: 'Perpustakaan Komunitas Mei',
      brandShort: 'Pustaka Mei',
      skipToContent: 'Lewati ke konten utama',
      headLibrarian: 'Kepala Pustakawan',
    },
    language: {
      label: 'Bahasa',
      switchToEn: 'Ganti bahasa ke English',
      switchToId: 'Ganti bahasa ke Bahasa Indonesia',
    },
    theme: {
      lightMode: 'Mode terang',
      darkMode: 'Mode gelap',
      lightShort: 'Terang',
      darkShort: 'Gelap',
      switchToLight: 'Ganti ke mode terang',
      switchToDark: 'Ganti ke mode gelap',
    },
    nav: {
      libraryNavigation: 'Navigasi perpustakaan',
      mobileNavigation: 'Navigasi perpustakaan mobile',
      breadcrumb: 'Jejak halaman',
      catalog: 'Katalog Buku',
      catalogShort: 'Katalog',
      lend: 'Pinjamkan',
      lendShort: 'Pinjamkan',
      history: 'Riwayat Pinjam',
      historyShort: 'Riwayat',
      addBook: 'Tambah Buku',
      addShort: 'Tambah',
      profileShort: 'Profil',
      signOut: 'Keluar',
    },
    auth: {
      connectingTitle: 'Menyiapkan Meja Pustakawan',
      connectingSubtitle: 'Memeriksa koneksi MongoDB dan sesi masuk Anda...',
      connectDbTitle: 'Sambungkan MongoDB Atlas',
      connectDbSubtitle:
        'Semua buku, catatan peminjaman, dan akun pustakawan tersimpan langsung di MongoDB.',
      connectStep1Prefix: 'Tambahkan',
      connectStep1Middle: 'di',
      connectStep1Suffix: 'lalu klik Apply.',
      connectStep2Prefix: 'Di MongoDB Atlas →',
      connectStep2Middle:
        ', izinkan hanya IP server atau rentang IP deployment Anda (hindari',
      connectStep2Suffix: 'di produksi).',
      connectStep3:
        'Setelah tersambung, Anda bisa langsung menambah buku atau menjalankan npm run seed di server untuk mengisi koleksi awal.',
      retryConnection: 'Coba Sambungkan Ulang',
      firstTimeBadge: 'Pengaturan Pertama Kali',
      setupTitle: 'Siapkan Akun Pustakawan',
      setupSubtitle:
        'Buat kata sandi untuk melindungi katalog Anda. Pengaturan ini otomatis terkunci setelah tersimpan di MongoDB.',
      librarianName: 'Nama Pustakawan',
      emailAddress: 'Alamat Email',
      createPassword: 'Buat Kata Sandi (min. 8 karakter)',
      createPasswordPlaceholder: 'Pilih kata sandi yang kuat',
      confirmPassword: 'Konfirmasi Kata Sandi',
      confirmPasswordPlaceholder: 'Ketik ulang kata sandi Anda',
      showPassword: 'Tampilkan kata sandi',
      hidePassword: 'Sembunyikan kata sandi',
      creatingAccount: 'Menyiapkan akun...',
      saveAccountAndEnter: 'Simpan Akun & Masuk',
      loginTitle: 'Selamat Datang Kembali',
      loginSubtitle:
        'Masuk dengan akun pustakawan Anda untuk mengelola koleksi dan peminjaman.',
      password: 'Kata Sandi',
      passwordPlaceholder: 'Masukkan kata sandi Anda',
      signingIn: 'Sedang masuk...',
      signIn: 'Masuk',
      setupTokenLabel: 'Token Pengaturan (Setup Token)',
      setupTokenPlaceholder: 'Masukkan SETUP_TOKEN dari server',
      errPasswordShort: 'Kata sandi minimal harus 8 karakter ya.',
      errPasswordMismatch: 'Konfirmasi kata sandi belum sama.',
      errEmailPasswordRequired: 'Mohon isi email dan kata sandi terlebih dahulu.',
      errSetupTokenRequired: 'Mohon masukkan setup token dari server.',
      errors: {
        sessionExpired: 'Sesi Anda telah berakhir. Silakan masuk kembali.',
        sessionChanged: 'Sesi Anda telah berubah.',
        logoutUnconfirmed:
          'Keluar secara lokal, tetapi sesi di server mungkin masih aktif. Memuat ulang halaman dapat memulihkannya.',
        setupFailed: 'Pengaturan akun belum berhasil diselesaikan. Silakan coba lagi.',
        loginFailed: 'Gagal masuk. Silakan coba lagi.',
        passwordChangeFailed: 'Kata sandi belum berhasil diperbarui. Silakan coba lagi.',
        genericRequestFailed: 'Permintaan gagal. Silakan coba lagi.',
        invalidServerResponse: 'Menerima respons tidak valid dari server.',
        dbNotConnected:
          'MongoDB belum terhubung. Atur MONGODB_URI di file .env atau variabel lingkungan server.',
        serverUnreachable:
          'Tidak dapat menjangkau server API perpustakaan. Silakan coba lagi.',
      },
    },
    accountPassword: {
      openProfileAria: 'Buka akun pustakawan dan ubah kata sandi',
      profileHint: 'Ubah kata sandi',
      modalTitle: 'Akun Pustakawan',
      modalSubtitle:
        'Perbarui kata sandi masuk Anda. Sesi aktif di perangkat lain akan otomatis dikeluarkan.',
      envManagedTitle: 'Kata sandi dikelola lewat konfigurasi server',
      envManagedBody:
        'Akun pustakawan ini menggunakan variabel lingkungan LIBRARIAN_PASSWORD. Ubah nilainya pada konfigurasi server lalu restart backend untuk mengganti kata sandi.',
      currentPassword: 'Kata Sandi Saat Ini',
      currentPasswordPlaceholder: 'Masukkan kata sandi saat ini',
      newPassword: 'Kata Sandi Baru (min. 8 karakter)',
      newPasswordPlaceholder: 'Pilih kata sandi baru yang kuat',
      confirmNewPassword: 'Konfirmasi Kata Sandi Baru',
      confirmNewPasswordPlaceholder: 'Ketik ulang kata sandi baru',
      saving: 'Memperbarui kata sandi...',
      savePassword: 'Simpan Kata Sandi',
      cancel: 'Batal',
      close: 'Tutup',
      errCurrentRequired: 'Mohon masukkan kata sandi saat ini.',
      errNewShort: 'Kata sandi baru minimal 8 karakter.',
      errNewTooLong: 'Kata sandi baru maksimal 128 karakter.',
      errSameAsCurrent: 'Kata sandi baru harus berbeda dari kata sandi saat ini.',
      errConfirmMismatch: 'Konfirmasi kata sandi baru belum sama.',
    },
    catalog: {
      heading: 'Katalog Buku',
      subheading: 'Jelajahi koleksi rak, cek stok eksemplar, atau mulai peminjaman baru.',
      collectionSummary: 'Ringkasan koleksi',
      totalTitles: 'Total Judul',
      copiesOnShelf: 'Eksemplar di Rak',
      activeLoans: 'Sedang Dipinjam',
      viewActive: 'Lihat aktif →',
      copiesCheckedOut: (count) => `${count} eksemplar sedang dipinjam`,
      runningLowLabel: 'Stok Menipis (≤ 2)',
      filtered: 'Tersaring',
      filterList: 'Saring rak',
      filtersAriaLabel: 'Filter dan urutan katalog',
      searchLabel: 'Cari judul, penulis, atau ISBN',
      searchPlaceholder: 'Cari judul, penulis, atau ISBN...',
      clearSearch: 'Hapus pencarian',
      genreLabel: 'Genre',
      allGenres: 'Semua Genre',
      searchGenrePlaceholder: 'Cari genre...',
      noGenresFound: 'Genre tidak ditemukan',
      sortByLabel: 'Urutkan',
      sortTitleAsc: 'Judul: A ke Z',
      sortTitleDesc: 'Judul: Z ke A',
      sortStockDesc: 'Stok: Terbanyak dulu',
      sortStockAsc: 'Stok: Paling sedikit',
      clearAllFilters: 'Reset Filter',
      emptyShelfTitle: 'Rak buku masih kosong',
      emptyShelfBody:
        'Tambahkan buku pertama untuk mulai mencatat stok dan meminjamkan koleksi ke pembaca.',
      addFirstBook: 'Tambah Buku Pertama',
      noMatchesTitle: 'Buku tidak ditemukan',
      noMatchesBody:
        'Coba pilih genre lain, ubah kata kunci, atau reset filter yang aktif.',
      statusAvailable: 'Tersedia',
      statusAvailableDetail: 'Tersedia di rak',
      statusLow: 'Stok menipis',
      statusOut: 'Habis',
      colTitleAuthor: 'Judul & Penulis',
      colGenre: 'Genre',
      colYearIsbn: 'Tahun / ISBN',
      colStock: 'Stok',
      colActions: 'Aksi',
      lendAction: 'Pinjamkan',
      editAction: 'Ubah',
      viewDetailsAria: (title) => `Lihat detail buku ${title}`,
      lendBookAria: (title) => `Pinjamkan ${title}`,
      editBookAria: (title) => `Ubah detail ${title}`,
      summaryLine: ({ count, genre, lowOnly, sortText }) =>
        `Menampilkan ${count} buku${genre ? ` di genre ${genre}` : ''}${
          lowOnly ? ' · stok menipis (≤ 2)' : ''
        } · diurutkan berdasarkan ${sortText}.`,
      sortSummary: {
        titleAsc: 'judul (A–Z)',
        titleDesc: 'judul (Z–A)',
        stockDesc: 'stok (terbanyak dulu)',
        stockAsc: 'stok (paling sedikit)',
      },
    },
    lending: {
      heading: 'Pinjamkan Buku',
      subheading:
        'Pilih buku dari rak, atur jumlah eksemplar, lalu tinjau ringkasan sebelum konfirmasi.',
      selectedBooksAria: 'Daftar buku yang akan dipinjamkan',
      selectedBooksTitle: 'Buku Dipilih',
      clearAll: 'Kosongkan',
      emptyDraftBody:
        'Belum ada buku di daftar pinjam. Pilih satu atau beberapa judul dari rak di bawah ini.',
      onShelfLeftAfter: (stock, remaining) => `${stock} di rak (sisa ${remaining} nanti)`,
      decreaseQtyAria: (title) => `Kurangi jumlah ${title}`,
      increaseQtyAria: (title) => `Tambah jumlah ${title}`,
      removeFromListAria: (title) => `Hapus ${title} dari daftar pinjam`,
      availableOnShelf: 'Tersedia di Rak',
      findBookLabel: 'Cari buku di rak',
      findBookPlaceholder: 'Cari judul atau penulis...',
      clearBookSearch: 'Hapus pencarian buku',
      filterGenreAria: 'Saring buku rak berdasarkan genre',
      noSearchMatches: 'Tidak ada buku yang cocok dengan pencarian ini.',
      onShelfCount: (stock) => `${stock} di rak`,
      addToLendingAria: (title) => `Tambahkan ${title} ke daftar pinjam`,
      outOfStock: 'Habis',
      addAnother: 'Tambah Lagi',
      add: 'Pilih',
      borrowerDetails: 'Data Peminjam',
      borrowerSubtitle:
        'Siapa yang meminjam buku ini? Anda bisa meninjau ulang semuanya sebelum disimpan.',
      borrowerName: 'Nama Peminjam',
      borrowerNamePlaceholder: 'cth. Rina Kusuma',
      phoneNumber: 'Nomor Telepon / WhatsApp',
      phonePlaceholder: 'cth. +62 812-3456-7890',
      dueDate: 'Tanggal Jatuh Tempo',
      selectDueDate: 'Pilih tanggal kembali',
      distinctTitles: 'Jumlah Judul',
      totalCopiesToLend: 'Total Eksemplar Dipinjam',
      preparingSummary: 'Menyiapkan ringkasan...',
      reviewCheckout: 'Tinjau Peminjaman',
      quickJumpSummary: (titles, copies) => `${titles} judul · ${copies} eksemplar`,
      previewFailedFallback: 'Gagal menyiapkan ringkasan peminjaman. Silakan coba lagi.',
      loadingLabel: 'Memuat meja peminjaman',
      draftOutOfSync: 'Daftar buku berubah. Harap tinjau ulang peminjaman Anda.',
    },
    history: {
      heading: 'Riwayat Peminjaman',
      subheading:
        'Pantau peminjaman yang masih aktif, tanggal jatuh tempo, dan buku yang sudah kembali.',
      newCheckout: 'Peminjaman Baru',
      filterStatusAria: 'Saring status peminjaman',
      statusAll: 'Semua',
      statusActive: 'Aktif',
      statusReturned: 'Kembali',
      searchLabel: 'Cari peminjam, telepon, kode, atau judul',
      searchPlaceholder: 'Cari peminjam, telepon, kode, atau judul...',
      clearSearch: 'Hapus pencarian riwayat',
      emptyTitle: 'Belum ada riwayat peminjaman',
      emptyBody:
        'Setiap peminjaman yang dikonfirmasi akan tercatat di sini beserta tombol pengembalian.',
      startCheckout: 'Mulai Peminjaman',
      noMatchesTitle: 'Tidak ada catatan yang cocok',
      noMatchesBody: 'Coba pindah tab status atau hapus kata kunci pencarian.',
      duePrefix: 'Jatuh tempo',
      overdue: 'Terlambat',
      confirmReturn: 'Konfirmasi Kembali',
      confirmReturnAria: (refCode) => `Konfirmasi pengembalian untuk ${refCode}`,
      returnBooks: 'Kembalikan',
      returnBooksAria: (refCode) => `Catat pengembalian untuk ${refCode}`,
      cancel: 'Batal',
      colRefDate: 'Kode & Tanggal',
      colBorrower: 'Peminjam',
      colBooksLent: 'Buku Dipinjam',
      colCopies: 'Jumlah',
      colDueDate: 'Jatuh Tempo',
      colStatusAction: 'Status & Aksi',
    },
    bookDetail: {
      kicker: 'Detail Buku',
      closeAria: 'Tutup jendela Detail Buku',
      shelfStock: 'Stok di Rak',
      copyUnit: () => 'eksemplar',
      shelfLocation: 'Lokasi Rak',
      notSet: 'Belum diatur',
      unassigned: 'Belum ditempatkan',
      copiesOutOnLoan: (count) => `${count} eksemplar sedang dipinjam`,
      noCopiesOut: 'Semua eksemplar ada di rak',
      aboutBook: 'Tentang buku ini',
      noSynopsis:
        'Belum ada sinopsis. Klik Ubah Detail untuk menambahkan ringkasan atau catatan pustakawan.',
      bibliographicAria: 'Informasi bibliografi',
      catalogInfo: 'Informasi Katalog',
      genre: 'Genre',
      publishedYear: 'Tahun Terbit',
      isbn: 'ISBN',
      publisher: 'Penerbit',
      pages: 'Halaman',
      pagesValue: (count) => `${count} halaman`,
      language: 'Bahasa',
      lastUpdated: 'Terakhir Diperbarui',
      activeLoansAria: 'Peminjaman aktif untuk buku ini',
      currentlyCheckedOut: (count) => `Sedang Dipinjam (${count})`,
      removeZoneAria: 'Hapus buku dari katalog',
      removeZoneTitle: 'Hapus dari katalog',
      removeZoneBody:
        'Menghapus judul ini secara permanen dari rak. Riwayat peminjaman sebelumnya tetap tersimpan.',
      removeBook: 'Hapus Buku',
      editDetails: 'Ubah Detail',
      lendBook: 'Pinjamkan Buku',
      outOfStock: 'Stok Habis',
    },
    bookForm: {
      editTitle: 'Ubah Detail Buku',
      addTitle: 'Tambah Buku Baru',
      editSubtitle: 'Perbarui sampul, info katalog, atau jumlah eksemplar di rak.',
      addSubtitle: 'Lengkapi sampul, detail buku, dan jumlah stok yang tersedia.',
      closeAria: (title) => `Tutup dialog ${title}`,
      coverPhotoLabel: 'Foto Sampul Buku (opsional)',
      coverPhotoHint:
        'Unggah foto JPG, PNG, atau WebP, atau tempel tautan gambar di bawah ini.',
      processingPhoto: 'Memproses...',
      replacePhoto: 'Ganti Foto',
      uploadPhoto: 'Unggah Foto',
      removePhoto: 'Hapus',
      coverUrlAria: 'Tautan gambar sampul',
      coverUrlPlaceholder: 'Atau tempel tautan gambar (https://...)',
      uploadedPhotoReady: 'Foto sampul siap disimpan.',
      currentPhotoActive:
        'Sampul perpustakaan sedang aktif. Unggah foto baru atau tempel tautan untuk menggantinya.',
      photoProcessError:
        'Foto belum bisa diproses. Coba gambar JPG, PNG, atau WebP yang lebih ringan.',
      photoErrors: {
        unsupportedType: 'Pilih gambar berformat JPG, PNG, atau WebP.',
        fileTooLarge: 'Ukuran berkas gambar maksimal 5 MB.',
        invalidImage: 'Berkas yang dipilih bukan gambar yang valid.',
        dimensionsTooLarge:
          'Dimensi gambar terlalu besar. Silakan pilih foto yang lebih kecil.',
        encodingFailed: 'Tidak dapat memproses gambar yang dipilih.',
        tooLargeAfterCompression:
          'Ukuran gambar setelah kompresi masih terlalu besar. Coba foto yang lebih kecil.',
      },
      bookTitle: 'Judul Buku',
      bookTitlePlaceholder: 'cth. Laskar Pelangi',
      author: 'Penulis',
      authorPlaceholder: 'cth. Andrea Hirata',
      genre: 'Genre',
      customGenreOption: '+ Tambah genre baru...',
      customGenreAria: 'Nama genre baru',
      customGenrePlaceholder: 'Ketik nama genre baru',
      copiesOnShelf: 'Stok di Rak',
      decreaseStockAria: 'Kurangi stok di rak',
      increaseStockAria: 'Tambah stok di rak',
      publishedYear: 'Tahun Terbit',
      publishedYearPlaceholder: 'cth. 2020',
      isbn: 'ISBN',
      isbnPlaceholder: 'cth. 978-0525559474',
      publisher: 'Penerbit',
      publisherPlaceholder: 'cth. Bentang Pustaka',
      pages: 'Jumlah Halaman',
      pagesPlaceholder: 'cth. 304',
      shelfLocation: 'Lokasi Rak',
      shelfLocationPlaceholder: 'cth. Lorong A · Rak 2',
      language: 'Bahasa Buku',
      languagePlaceholder: 'cth. Bahasa Indonesia',
      synopsis: 'Sinopsis / Catatan',
      synopsisPlaceholder:
        'Tulis ringkasan singkat atau catatan pustakawan tentang edisi ini...',
      cancel: 'Batal',
      saving: 'Menyimpan...',
      saveChanges: 'Simpan Perubahan',
      saveBook: 'Simpan Buku',
      saveFailedFallback: 'Buku belum berhasil disimpan. Silakan coba lagi.',
      defaultCoverTitle: 'Sampul Buku',
    },
    confirmDelete: {
      title: (bookTitle) => `Hapus “${bookTitle}” dari katalog?`,
      bodyBefore: 'Tindakan ini akan menghapus',
      bodyAfter: (stock) =>
        `(${stock} eksemplar di rak) dari katalog. Catatan peminjaman lama tetap aman di Riwayat Pinjam.`,
      cancel: 'Batal',
      removing: 'Menghapus...',
      removeTitle: 'Hapus Buku',
    },
    lendingSummary: {
      title: 'Ringkasan Peminjaman',
      subtitle: 'Cek ulang data peminjam dan sisa stok rak sebelum konfirmasi.',
      closeAria: 'Tutup ringkasan peminjaman',
      borrower: 'Peminjam',
      phoneNumber: 'Nomor Telepon',
      dueDate: 'Jatuh Tempo',
      booksIncluded: (titles, copies) =>
        `Daftar Buku (${titles} judul · ${copies} eksemplar)`,
      colBookTitle: 'Judul Buku',
      colQty: 'Jml',
      colShelfStock: 'Stok Rak',
      disclaimer:
        'Konfirmasi akan mencatat transaksi ke Riwayat Pinjam dan langsung mengurangi stok di rak.',
      editDetails: 'Kembali & Ubah',
      confirming: 'Memproses...',
      confirmCheckout: 'Konfirmasi Peminjaman',
    },
    calendar: {
      previousMonth: 'Bulan sebelumnya',
      nextMonth: 'Bulan berikutnya',
      today: 'Hari ini',
      preset7Days: '+7 hari',
      preset14Days: '+14 hari',
      preset30Days: '+30 hari',
      chooseDate: 'Pilih tanggal',
      dialogLabel: 'Kalender jatuh tempo',
    },
    toast: {
      dismissAria: 'Tutup notifikasi',
      loadCatalogError: 'Belum bisa memuat katalog perpustakaan saat ini.',
      refreshError: 'Belum bisa menyegarkan data perpustakaan.',
      bookAdded: (title, stock) =>
        `"${title}" berhasil ditambahkan (${stock} eksemplar di rak).`,
      bookUpdated: (title) => `Perubahan untuk "${title}" sudah tersimpan.`,
      bookRemoved: (title) => `"${title}" dihapus dari katalog.`,
      removeBookError: 'Buku belum berhasil dihapus.',
      checkoutConfirmed: (copies, borrower, refCode) =>
        `Berhasil meminjamkan ${copies} eksemplar kepada ${borrower} (${refCode}). Stok rak diperbarui.`,
      checkoutError: 'Peminjaman belum berhasil dikonfirmasi.',
      booksReturned: (refCode, copies) =>
        `Pengembalian ${refCode} tercatat — ${copies} eksemplar kembali ke rak.`,
      returnError: 'Pengembalian belum berhasil dicatat.',
      passwordChanged:
        'Kata sandi berhasil diperbarui. Sesi aktif lainnya telah dikeluarkan.',
    },
    validation: {
      titleRequired: 'Mohon isi judul bukunya.',
      titleTooLong: 'Judul buku maksimal 180 karakter.',
      authorRequired: 'Mohon isi nama penulisnya.',
      authorTooLong: 'Nama penulis maksimal 120 karakter.',
      genreRequired: 'Mohon pilih atau ketik genre buku.',
      genreTooLong: 'Nama genre maksimal 60 karakter.',
      stockInvalid: 'Masukkan angka bulat antara 0 sampai 10.000.',
      yearInvalid: (maxYear) => `Masukkan tahun terbit antara 1000 sampai ${maxYear}.`,
      pagesInvalid: 'Masukkan jumlah halaman antara 1 sampai 20.000.',
      isbnTooLong: 'ISBN maksimal 40 karakter.',
      publisherTooLong: 'Nama penerbit maksimal 120 karakter.',
      shelfTooLong: 'Lokasi rak maksimal 60 karakter.',
      languageTooLong: 'Bahasa buku maksimal 40 karakter.',
      descriptionTooLong: 'Sinopsis maksimal 1.200 karakter.',
      coverInvalid:
        'Gunakan tautan gambar http(s) yang valid atau unggah foto JPG, PNG, atau WebP.',
      borrowerNameShort: 'Nama peminjam minimal 2 karakter.',
      borrowerNameTooLong: 'Nama peminjam maksimal 120 karakter.',
      phoneInvalid: 'Masukkan nomor telepon yang valid (7–15 digit).',
      dueDateInvalid: 'Mohon pilih tanggal jatuh tempo yang valid.',
      itemsEmpty: 'Pilih minimal satu buku untuk dipinjamkan.',
      itemMissing: 'Salah satu buku yang dipilih sudah tidak ada di katalog.',
      itemQtyMin: (title) => `Jumlah untuk "${title}" minimal 1 eksemplar.`,
      itemQtyExceeds: (stock, title) =>
        `Stok "${title}" tinggal ${stock} eksemplar di rak.`,
    },
    errorBoundary: {
      title: 'Terjadi kesalahan',
      message:
        'Terjadi kesalahan tak terduga saat menampilkan perpustakaan. Muat ulang halaman untuk memulihkan.',
      reload: 'Muat Ulang Halaman',
    },
  },
};
