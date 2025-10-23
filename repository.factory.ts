import { BOMRepository, BOMRepositoryImpl } from './bom.repository';
import { UserRepository } from './user.repository';
import { ProjectRepository, ProjectRepositoryImpl } from './project.repository';

export class RepositoryFactory {
  private static bomRepository: BOMRepository;
  private static userRepository: UserRepository;
  private static projectRepository: ProjectRepository;

  static getBOMRepository(): BOMRepository {
    if (!this.bomRepository) {
      this.bomRepository = new BOMRepositoryImpl();
    }
    return this.bomRepository;
  }

  static getUserRepository(): UserRepository {
    if (!this.userRepository) {
      this.userRepository = new UserRepository();
    }
    return this.userRepository;
  }

  static getProjectRepository(): ProjectRepository {
    if (!this.projectRepository) {
      this.projectRepository = new ProjectRepositoryImpl();
    }
    return this.projectRepository;
  }

  // For testing - allows injection of mock repositories
  static setBOMRepository(repository: BOMRepository): void {
    this.bomRepository = repository;
  }

  static setUserRepository(repository: UserRepository): void {
    this.userRepository = repository;
  }

  static setProjectRepository(repository: ProjectRepository): void {
    this.projectRepository = repository;
  }

  // Reset all repositories (useful for testing)
  static reset(): void {
    this.bomRepository = null as any;
    this.userRepository = null as any;
    this.projectRepository = null as any;
  }
}