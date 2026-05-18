-- Add a column in the definition of scenarios so that algorithms know if a problem is target-location or exit-zone
ALTER TABLE Scenarios 
ADD COLUMN zone_problem BOOLEAN NOT NULL DEFAULT False; 