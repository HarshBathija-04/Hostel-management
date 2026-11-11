// Shapes returned by the Hostel API (snake_case, straight from Postgres).

export type Role = 'student' | 'admin';

export interface SessionUser {
  role: Role;
  id: number;
  name: string;
  subtitle: string;
  adminRole?: 'super_admin' | 'admin';
}

export interface Pagination {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface Block {
  id: number;
  block_name: string;
  block_code: string;
  gender_type: 'male' | 'female' | 'mixed';
  description: string | null;
  total_floors: number;
  warden_name?: string | null;
  warden_contact?: string | null;
  is_active?: boolean;
  total_rooms?: number;
  total_capacity?: number | null;
  total_occupied?: number | null;
}

export type RoomType = 'single' | 'double' | 'triple' | 'quad';
export type RoomStatus = 'available' | 'full' | 'maintenance' | 'reserved';

export interface Room {
  id: number;
  room_number: string;
  block_id: number;
  block_name: string;
  block_code: string;
  gender_type: Block['gender_type'];
  floor_number: number;
  room_type: RoomType;
  capacity: number;
  occupied_beds: number;
  available_beds: number;
  room_status: RoomStatus;
  facilities: string | null;
  monthly_rent: number;
  is_active: boolean;
}

export type ApplicationStatus = 'pending' | 'approved' | 'rejected' | 'waitlisted' | 'cancelled';

export interface Application {
  id: number;
  student_id: string | number;
  student_name?: string;
  email?: string;
  course?: string;
  year_of_study?: number;
  gender?: string;
  preferred_block_id: number | null;
  preferred_block?: string | null;
  block_name?: string | null;
  block_code?: string | null;
  preferred_room_type: RoomType | 'any';
  application_date: string;
  preferred_start_date: string | null;
  duration_months: number;
  special_requirements: string | null;
  status: ApplicationStatus;
  admin_remarks: string | null;
  processed_at: string | null;
  allocated_room_number?: string | null;
}

export interface Allocation {
  id: number;
  student_id: string | number;
  student_name?: string;
  room_id: number;
  room_number: string;
  room_type?: RoomType;
  floor_number?: number;
  facilities?: string | null;
  block_name: string;
  block_code?: string;
  warden_name?: string | null;
  warden_contact?: string | null;
  bed_number: number;
  allocation_date: string;
  start_date: string;
  end_date: string | null;
  rent_amount: number;
  security_deposit: number;
  payment_status: 'pending' | 'partial' | 'paid' | 'refunded';
  allocation_status: 'active' | 'expired' | 'terminated' | 'extended';
  termination_reason?: string | null;
}

export interface Payment {
  id: number;
  allocation_id?: number;
  student_code?: string;
  student_name?: string;
  amount: number;
  payment_type: 'rent' | 'security_deposit' | 'fine' | 'other';
  payment_method: 'cash' | 'card' | 'bank_transfer' | 'online';
  transaction_id: string | null;
  payment_date: string;
  month_year: string | null;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  remarks: string | null;
  room_number?: string;
  block_code?: string;
}

export type ComplaintStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type ComplaintCategory = 'electrical' | 'plumbing' | 'furniture' | 'cleaning' | 'internet' | 'other';

export interface Complaint {
  id: number;
  student_code?: string;
  student_name?: string;
  room_number?: string | null;
  block_code?: string | null;
  category: ComplaintCategory;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  status: ComplaintStatus;
  admin_response: string | null;
  resolved_at: string | null;
  created_at: string;
}

export interface Student {
  id: number;
  student_id: string;
  email: string;
  first_name: string;
  last_name: string;
  gender: 'male' | 'female' | 'other';
  phone: string | null;
  address?: string | null;
  course: string;
  department: string | null;
  year_of_study: number;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  is_active: boolean;
  has_allocation?: boolean;
  room_number?: string | null;
  block_name?: string | null;
  created_at?: string;
}
