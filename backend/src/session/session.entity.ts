import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { SubmissionEntity } from '../submission/submission.entity';

const expiresAtColumnType =
  process.env.LESSON_SYSTEM_DB_DRIVER === 'sqljs' ? 'datetime' : 'timestamptz';

@Entity('sessions')
export class SessionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @Column()
  title!: string;

  @Column({ unique: true })
  joinCode!: string;

  @Column({ type: expiresAtColumnType, nullable: true })
  expiresAt!: Date | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  assignmentFileName!: string | null;

  @Column({ type: 'text', nullable: true })
  assignmentText!: string | null;

  @OneToMany(() => SubmissionEntity, (s) => s.session)
  submissions!: SubmissionEntity[];
}
