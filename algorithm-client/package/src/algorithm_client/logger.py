class Logger:
    """An extremely simple logger"""

    file: str  # path of file to log to

    def __init__(self, file: str):
        self.file = file

    # write a message to the log file
    def logmsg(self, message: str):
        # make sure the file is always closed after a write
        with open(self.file, "a") as f:
            f.write(message + "\n")

    # write an error to the log file
    def logerr(self, error: str):
        # make sure the file is always closed after a write
        with open(self.file, "a") as f:
            f.write("ERROR:  " + error + "\n")
