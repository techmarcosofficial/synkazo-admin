import { ProjectCard } from '@/features/projects/components/cards';
import type { ProjectExtended } from '@/features/projects/types';

interface ProjectGridProps {
  projects: ProjectExtended[];
  jobCountsByProject: Record<string, number>;
  organisationNamesById?: Map<string, string>;
}

export default function ProjectGrid({
  projects,
  jobCountsByProject,
  organisationNamesById,
}: ProjectGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          jobCount={jobCountsByProject[project.id] ?? 0}
          organisationName={organisationNamesById?.get(project.organisationId)}
        />
      ))}
    </div>
  );
}
