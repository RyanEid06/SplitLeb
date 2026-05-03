export type SavedGroupMember = {
  id: string;
  displayName: string;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
};

export type SavedGroup = {
  id: string;
  name: string;
  members: SavedGroupMember[];
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
};