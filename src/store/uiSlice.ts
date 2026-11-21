import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface UiState {
  isSidebarOpen: boolean;
  notificationDropdownOpen: boolean;
}

const initialState: UiState = {
  isSidebarOpen: false,
  notificationDropdownOpen: false,
};

export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.isSidebarOpen = !state.isSidebarOpen;
    },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.isSidebarOpen = action.payload;
    },
    toggleNotificationDropdown: (state) => {
      state.notificationDropdownOpen = !state.notificationDropdownOpen;
    },
    setNotificationDropdownOpen: (state, action: PayloadAction<boolean>) => {
      state.notificationDropdownOpen = action.payload;
    },
  },
});

export const {
  toggleSidebar,
  setSidebarOpen,
  toggleNotificationDropdown,
  setNotificationDropdownOpen,
} = uiSlice.actions;

export default uiSlice.reducer;
