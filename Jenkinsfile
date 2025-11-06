pipeline {
    agent any

    environment {
        // Change this to your Docker Hub username
        DOCKER_IMAGE = "sanjeethmanikandan/blue-green-node-app"
        // Jenkins credential ID for Docker Hub login
        DOCKER_CREDENTIALS = "dockerhub-creds"
    }

    stages {
        stage('Checkout Code') {
            steps {
                echo "Checking out source code..."
                checkout scm
            }
        }

        stage('Build Docker Image') {
            steps {
                script {
                    // Tag image using Jenkins build number
                    IMAGE_TAG = "${env.BUILD_NUMBER}"
                    FULL_IMAGE = "${DOCKER_IMAGE}:${IMAGE_TAG}"
                    LATEST_IMAGE = "${DOCKER_IMAGE}:latest"

                    echo "Building Docker image: ${FULL_IMAGE}"
                    sh """
                        docker build -t ${FULL_IMAGE} -t ${LATEST_IMAGE} .
                    """
                }
            }
        }

        stage('Push to Docker Hub') {
            steps {
                script {
                    echo "Pushing image to Docker Hub..."
                    withCredentials([usernamePassword(credentialsId: DOCKER_CREDENTIALS, usernameVariable: 'USER', passwordVariable: 'PASS')]) {
                        sh """
                            echo $PASS | docker login -u $USER --password-stdin
                            docker push ${FULL_IMAGE}
                            docker push ${LATEST_IMAGE}
                            docker logout
                        """
                    }
                }
            }
        }

        stage('Blue-Green Deployment') {
            steps {
                script {
                    echo "Starting Blue-Green deployment process..."

                    // Detect which container is currently active
                    def activeContainer = sh(
                        script: "docker ps --format '{{.Names}}' | grep -E 'blue|green' || true",
                        returnStdout: true
                    ).trim()

                    def newColor, oldColor, newPort

                    if (activeContainer == "blue") {
                        newColor = "green"
                        oldColor = "blue"
                        newPort = "3002"
                    } else {
                        newColor = "blue"
                        oldColor = "green"
                        newPort = "3001"
                    }

                    echo "Active container: ${activeContainer == '' ? 'none' : activeContainer}"
                    echo "Deploying new version as ${newColor} container on port ${newPort}"

                    // Pull the latest image (optional for local)
                    sh "docker pull ${FULL_IMAGE} || true"

                    // Stop existing newColor container if exists
                    sh "docker rm -f ${newColor} || true"

                    // Run the new container
                    sh """
                        docker run -d --name ${newColor} -e APP_VERSION=${IMAGE_TAG} -p ${newPort}:3000 ${FULL_IMAGE}
                    """

                    // Health check loop
                    echo "Performing health check..."
                    def retries = 10
                    def success = false
                    for (int i = 0; i < retries; i++) {
                        def result = sh(
                            script: "curl -sSf http://localhost:${newPort}/health || true",
                            returnStdout: true
                        ).trim()
                        if (result.contains("OK")) {
                            echo "Health check passed!"
                            success = true
                            break
                        }
                        sleep 3
                    }

                    if (!success) {
                        error("❌ Health check failed! Rolling back deployment.")
                    }

                    // If healthy, remove the old container
                    if (oldColor != "") {
                        echo "Stopping old container: ${oldColor}"
                        sh "docker rm -f ${oldColor} || true"
                    }

                    echo "✅ Successfully switched to ${newColor} container (version ${IMAGE_TAG})"
                }
            }
        }
    }

    post {
        success {
            echo "🎉 Blue-Green Deployment completed successfully!"
        }
        failure {
            echo "⚠️ Deployment failed. Review the Jenkins logs."
        }
    }
}
