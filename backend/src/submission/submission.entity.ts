import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { SessionEntity } from '../session/session.entity';

@Entity('submissions')
export class SubmissionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @Column()
  studentName!: string;

  @Column()
  group!: string;

  @Column()
  originalFilename!: string;

  @Column()
  storedPath!: string;

  @ManyToOne(() => SessionEntity, (s) => s.submissions, { onDelete: 'CASCADE' })
  session!: SessionEntity;

  @Column()
  sessionId!: string;
}

