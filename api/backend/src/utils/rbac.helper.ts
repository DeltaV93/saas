import { ForbiddenException } from '@nestjs/common';

export function checkUserRole(userRole: string, requiredRole: string) {
  if (userRole !== requiredRole) {
    throw new ForbiddenException('Access denied: insufficient permissions');
  }
}

export function restrictAccess(roles: string[], userRole: string) {
  if (!roles.includes(userRole)) {
    throw new ForbiddenException('Access denied: insufficient permissions');
  }
} 