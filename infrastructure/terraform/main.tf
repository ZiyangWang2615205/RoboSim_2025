terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  required_version = ">= 1.5.0"
}

provider "aws" {
  region  = "eu-north-1"
  profile = "default"
}

# The Virtual Private Cloud that the ECS task will run in
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"

  tags = {
    Name = "robosim-vpc"
  }
}

# Create a public subnet in the VPC
resource "aws_subnet" "public_subnet" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.1.0/24"
  map_public_ip_on_launch = true
  availability_zone       = "eu-north-1a"

  tags = {
    Name = "robosim-public-subnet"
  }
}

resource "aws_subnet" "second_subnet" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.2.0/24"
  map_public_ip_on_launch = true
  availability_zone       = "eu-north-1b"
}

# An internet gateway for the subnet, so it can access the ECR image
resource "aws_internet_gateway" "gw" {
  vpc_id = aws_vpc.main.id
}

resource "aws_route_table" "public_rt" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.gw.id
  }
}

resource "aws_route_table_association" "public_assoc" {
  subnet_id      = aws_subnet.public_subnet.id
  route_table_id = aws_route_table.public_rt.id
}

resource "aws_route_table_association" "second_assoc" {
  subnet_id      = aws_subnet.second_subnet.id
  route_table_id = aws_route_table.public_rt.id
}

resource "aws_lb" "robosim_alb" {
  name               = "robosim-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.robosim_alb_sg.id]
  subnets            = [aws_subnet.public_subnet.id, aws_subnet.second_subnet.id] # Add more if using multiple subnets

  enable_deletion_protection = false
}

resource "aws_lb_target_group" "robosim_tg" {
  name        = "robosim-tg"
  target_type = "ip"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id

  health_check {
    path                = "/api/health"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }
}

resource "aws_lb_target_group" "robosim_ws_tg" {
  name        = "robosim-ws-tg"
  target_type = "ip"
  port        = 7071
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id

  health_check {
    path                = "/health"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.robosim_alb.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.robosim_tg.arn
  }
}

resource "aws_lb_listener_rule" "ws_rule" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 1

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.robosim_ws_tg.arn
  }

  condition {
    path_pattern {
      values = ["/ws*"]
    }
  }
}

# The log group for the ECS task
resource "aws_cloudwatch_log_group" "robosim_log_group" {
  name              = "/ecs/robosim"
  retention_in_days = 7

  tags = {
    Name = "robosim-log-group"
  }
}

# The ECS cluster
resource "aws_ecs_cluster" "RoboSimCluster" {
  name = "robosim-cluster"
}

# The task that is run in the cluster
resource "aws_ecs_task_definition" "RoboSimTask" {
  family = "robosim-task"
  container_definitions = jsonencode([
    {
      name      = "robosim-container"
      image     = "761018850201.dkr.ecr.eu-north-1.amazonaws.com/robosim:latest"
      cpu       = 256
      memory    = 512
      essential = true
      portMappings = [
        # The web server
        {
          containerPort = 3000
          hostPort      = 3000
        },
        # The WebSocket server
        {
          containerPort = 7071
          hostPort      = 7071
        }
      ]
      # Use the log group created earlier
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.robosim_log_group.name
          "awslogs-region"        = "eu-north-1"
          "awslogs-stream-prefix" = "ecs"
        }
      }
    }
  ])

  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 256
  memory                   = 512
  execution_role_arn       = aws_iam_role.ecs_execution_role.arn
}

resource "aws_security_group" "robosim_alb_sg" {
  name        = "robosim-alb-sg"
  description = "Allow inbound traffic to ALB"
  vpc_id      = aws_vpc.main.id

  # Allow inbound HTTP (port 3000) and WebSocket (port 7071)
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 7071
    to_port     = 7071
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Allow all outbound traffic
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# Configure the security rules for the ECS task
# Currently we allow inbound traffic on port 3000 and 7071, from anywhere
resource "aws_security_group" "RoboSimSG" {
  name        = "robosim-sg"
  description = "Allow inbound traffic to robosim"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 7071
    to_port     = 7071
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# Create the service in the cluster that will run the task
resource "aws_ecs_service" "RoboSimService" {
  name            = "robosim-service"
  cluster         = aws_ecs_cluster.RoboSimCluster.id
  task_definition = aws_ecs_task_definition.RoboSimTask.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    assign_public_ip = true
    security_groups  = [aws_security_group.RoboSimSG.id]
    subnets          = [aws_subnet.public_subnet.id, aws_subnet.second_subnet.id]
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.robosim_tg.arn
    container_name   = "robosim-container"
    container_port   = 3000
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.robosim_ws_tg.arn
    container_name   = "robosim-container"
    container_port   = 7071
  }

  depends_on = [
    aws_ecs_cluster.RoboSimCluster,
    aws_security_group.RoboSimSG,
    aws_lb.robosim_alb,
    aws_lb_target_group.robosim_tg
  ]
}

# Define the IAM roles that the ECS task will use
# This role allows the ECS task to run
resource "aws_iam_role" "ecs_execution_role" {
  name = "ecs-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

# This role allows the ECS task to pull images from ECR
resource "aws_iam_policy" "ecs_ecr_access" {
  name        = "ecs-ecr-access"
  description = "Allows ECS tasks to pull private images from ECR"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:BatchCheckLayerAvailability"
        ]
        Resource = "arn:aws:ecr:eu-north-1:761018850201:repository/robosim"
      },
      {
        Effect   = "Allow"
        Action   = "ecr:GetAuthorizationToken"
        Resource = "*"
      }
    ]
  })
}

# Attach the second role to the first
resource "aws_iam_role_policy_attachment" "ecs_execution_role_attach" {
  role       = aws_iam_role.ecs_execution_role.name
  policy_arn = aws_iam_policy.ecs_ecr_access.arn
}

# Allow the ECS task to write logs to CloudWatch
resource "aws_iam_policy" "ecs_logs_access" {
  name        = "ecs-logs-access"
  description = "Allows ECS tasks to create log streams and write logs to CloudWatch"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:eu-north-1:761018850201:log-group:/ecs/robosim:*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_logs_access_attach" {
  role       = aws_iam_role.ecs_execution_role.name
  policy_arn = aws_iam_policy.ecs_logs_access.arn
}
