import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import React, { useEffect, useMemo, useState } from 'react'
import {
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import AppTopBar from '../components/AppTopBar'
import BottomNav from '../components/BottomNav'
import Picker from '../components/Picker'
import ShareModal from '../components/ShareModal'
import { hp, wp } from '../helpers/common'
import { isFeatureEnabled } from '../utils/featureGates'
import { useAppTheme } from './theme'

// Mock professors data
// TODO: Wire to real Supabase data
// - Fetch professors from professors table
// - Fetch reviews from professor_reviews table
const professors: any[] = []
const reviews: any = {}

const DEPARTMENTS = [
  { value: 'all', label: 'All Departments' },
  { value: 'cs', label: 'Computer Science' },
  { value: 'math', label: 'Mathematics' },
  { value: 'psych', label: 'Psychology' },
  { value: 'business', label: 'Business' },
  { value: 'bio', label: 'Biology' },
  { value: 'eng', label: 'Engineering' },
  { value: 'english', label: 'English' },
  { value: 'chem', label: 'Chemistry' },
]

const SORT_OPTIONS = [
  { value: 'rating', label: 'Highest Rated' },
  { value: 'difficulty', label: 'Easiest First' },
  { value: 'reviews', label: 'Most Reviews' },
  { value: 'name', label: 'Name A-Z' },
]

export default function RateProfessor() {
  const theme = useAppTheme()
  const styles = createStyles(theme)
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDepartment, setSelectedDepartment] = useState('all')
  const [sortBy, setSortBy] = useState('rating')
  const [selectedProfessor, setSelectedProfessor] = useState(null)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [shareContent, setShareContent] = useState(null)

  // Gate: Redirect if feature is disabled
  useEffect(() => {
    if (!isFeatureEnabled('RATE_MY_PROFESSOR')) {
      router.replace('/yearbook')
    }
  }, [router])

  // Filter and sort professors
  const filteredProfessors = useMemo(() => {
    let filtered = professors.filter((prof) => {
      const matchesSearch =
        prof.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prof.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prof.courses.some((course) =>
          course.toLowerCase().includes(searchQuery.toLowerCase())
        )

      const matchesDept =
        selectedDepartment === 'all' ||
        prof.department.toLowerCase().includes(selectedDepartment.toLowerCase())

      return matchesSearch && matchesDept
    })

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return b.overallRating - a.overallRating
        case 'difficulty':
          return a.difficulty - b.difficulty
        case 'reviews':
          return b.totalRatings - a.totalRatings
        case 'name':
          return a.name.localeCompare(b.name)
        default:
          return 0
      }
    })

    return filtered
  }, [searchQuery, selectedDepartment, sortBy])

  const renderStars = (rating) => {
    const stars = []
    const fullStars = Math.floor(rating)
    const hasHalfStar = rating % 1 >= 0.5

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(
          <Ionicons key={i} name="star" size={hp(1.8)} color="#FFD700" />
        )
      } else if (i === fullStars && hasHalfStar) {
        stars.push(
          <Ionicons
            key={i}
            name="star-half"
            size={hp(1.8)}
            color="#FFD700"
          />
        )
      } else {
        stars.push(
          <Ionicons
            key={i}
            name="star-outline"
            size={hp(1.8)}
            color="#CCCCCC"
          />
        )
      }
    }
    return stars
  }

  const renderProfessorCard = ({ item }) => (
    <TouchableOpacity
      style={styles.professorCard}
      onPress={() => setSelectedProfessor(item)}
      activeOpacity={0.7}
    >
      <View style={styles.professorHeader}>
        <View style={styles.professorInfo}>
          <Text style={styles.professorName}>{item.name}</Text>
          <Text style={styles.professorDept}>{item.department}</Text>
        </View>
        <View style={styles.ratingBadge}>
          <Text style={styles.ratingNumber}>{item.overallRating.toFixed(1)}</Text>
        </View>
      </View>

      <View style={styles.ratingRow}>
        <View style={styles.ratingItem}>
          {renderStars(item.overallRating)}
        </View>
        <Text style={styles.ratingText}>
          {item.totalRatings} {item.totalRatings === 1 ? 'review' : 'reviews'}
        </Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Difficulty</Text>
          <View style={styles.difficultyBar}>
            <View
              style={[
                styles.difficultyFill,
                {
                  width: `${(item.difficulty / 5) * 100}%`,
                  backgroundColor:
                    item.difficulty <= 2
                      ? '#2ecc71'
                      : item.difficulty <= 3.5
                      ? '#f39c12'
                      : '#e74c3c',
                },
              ]}
            />
          </View>
          <Text style={styles.statValue}>{item.difficulty.toFixed(1)}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Would Take Again</Text>
          <Text style={styles.statValue}>
            {Math.round(item.wouldTakeAgain * 100)}%
          </Text>
        </View>
      </View>

      <View style={styles.coursesRow}>
        <Text style={styles.coursesLabel}>Courses:</Text>
        {item.courses.map((course, index) => (
          <View key={index} style={styles.courseTag}>
            <Text style={styles.courseTagText}>{course}</Text>
          </View>
        ))}
      </View>

      <View style={styles.tagsRow}>
        {item.tags.map((tag, index) => (
          <View key={index} style={styles.tag}>
            <Text style={styles.tagText}>{tag}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={styles.shareButton}
        onPress={(e) => {
          e.stopPropagation()
          setShareContent({
            type: 'professor',
            data: item,
          })
          setShowShareModal(true)
        }}
        activeOpacity={0.7}
      >
        <Ionicons name="share-outline" size={hp(2)} color={theme.colors.textSecondary} />
        <Text style={styles.shareButtonText}>Share</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  )

  const renderReview = ({ item }) => (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <View style={styles.reviewHeaderLeft}>
          <Text style={styles.reviewCourse}>{item.course}</Text>
          <View style={styles.reviewRating}>
            {renderStars(item.rating)}
          </View>
        </View>
        <Text style={styles.reviewDate}>{item.date}</Text>
      </View>

      <View style={styles.reviewStats}>
        <View style={styles.reviewStat}>
          <Ionicons name="school-outline" size={hp(1.5)} color={theme.colors.softBlack} />
          <Text style={styles.reviewStatText}>Grade: {item.grade}</Text>
        </View>
        <View style={styles.reviewStat}>
          <Ionicons name="bar-chart-outline" size={hp(1.5)} color={theme.colors.softBlack} />
          <Text style={styles.reviewStatText}>Difficulty: {item.difficulty}/5</Text>
        </View>
        {item.wouldTakeAgain && (
          <View style={styles.reviewStat}>
            <Ionicons name="checkmark-circle" size={hp(1.5)} color="#2ecc71" />
            <Text style={[styles.reviewStatText, { color: '#2ecc71' }]}>
              Would Take Again
            </Text>
          </View>
        )}
      </View>

      <Text style={styles.reviewText}>{item.text}</Text>

      <View style={styles.reviewFooter}>
        <TouchableOpacity style={styles.helpfulButton}>
          <Ionicons name="thumbs-up-outline" size={hp(1.5)} color={theme.colors.softBlack} />
          <Text style={styles.helpfulText}>
            Helpful ({item.helpful})
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        <AppTopBar
          schoolName="University of Rhode Island"
          onPressProfile={() => router.push('/profile')}
          onPressSchool={() => {}}
          onPressNotifications={() => router.push('/notifications')}
        />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Rate My Professor</Text>
            <Text style={styles.subtitle}>
              Find and rate professors at your school
            </Text>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Ionicons
              name="search"
              size={hp(2.2)}
              color={theme.colors.softBlack}
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search professors, courses, or departments..."
              placeholderTextColor={theme.colors.softBlack + '60'}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                style={styles.clearButton}
              >
                <Ionicons
                  name="close-circle"
                  size={hp(2)}
                  color={theme.colors.softBlack}
                />
              </TouchableOpacity>
            )}
          </View>

          {/* Filters */}
          <View style={styles.filtersRow}>
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Department</Text>
              <Picker
                options={DEPARTMENTS}
                value={selectedDepartment}
                onValueChange={setSelectedDepartment}
                placeholder="All Departments"
              />
            </View>
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Sort By</Text>
              <Picker
                options={SORT_OPTIONS}
                value={sortBy}
                onValueChange={setSortBy}
                placeholder="Highest Rated"
              />
            </View>
          </View>

          {/* Results Count */}
          <Text style={styles.resultsCount}>
            {filteredProfessors.length}{' '}
            {filteredProfessors.length === 1 ? 'professor' : 'professors'} found
          </Text>

          {/* Professors List */}
          <FlatList
            data={filteredProfessors}
            renderItem={renderProfessorCard}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            contentContainerStyle={styles.professorsList}
          />
        </ScrollView>

        {/* Professor Detail Modal */}
        {selectedProfessor && (
          <Modal
            visible={!!selectedProfessor}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={() => setSelectedProfessor(null)}
          >
            <SafeAreaView style={styles.modalSafeArea} edges={['top', 'left', 'right']}>
              <View style={styles.modalContainer}>
                {/* Modal Header */}
                <View style={styles.modalHeader}>
                  <TouchableOpacity
                    onPress={() => setSelectedProfessor(null)}
                    style={styles.modalCloseButton}
                  >
                    <Ionicons name="close" size={hp(2.5)} color={theme.colors.charcoal} />
                  </TouchableOpacity>
                  <Text style={styles.modalTitle}>Professor Details</Text>
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedProfessor(null)
                      setShowReviewModal(true)
                    }}
                    style={styles.modalAddButton}
                  >
                    <Ionicons
                      name="add-circle"
                      size={hp(2.5)}
                      color={theme.colors.bondedPurple}
                    />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  style={styles.modalScrollView}
                  contentContainerStyle={styles.modalScrollContent}
                  showsVerticalScrollIndicator={false}
                >
                  {/* Professor Info */}
                  <View style={styles.professorDetailHeader}>
                    <Text style={styles.professorDetailName}>
                      {selectedProfessor.name}
                    </Text>
                    <Text style={styles.professorDetailDept}>
                      {selectedProfessor.department}
                    </Text>

                    <View style={styles.professorDetailRating}>
                      <View style={styles.ratingDisplay}>
                        <Text style={styles.ratingDisplayNumber}>
                          {selectedProfessor.overallRating.toFixed(1)}
                        </Text>
                        <View style={styles.ratingDisplayStars}>
                          {renderStars(selectedProfessor.overallRating)}
                        </View>
                        <Text style={styles.ratingDisplayCount}>
                          {selectedProfessor.totalRatings} reviews
                        </Text>
                      </View>
                    </View>

                    <View style={styles.professorDetailStats}>
                      <View style={styles.detailStatCard}>
                        <Text style={styles.detailStatValue}>
                          {selectedProfessor.difficulty.toFixed(1)}
                        </Text>
                        <Text style={styles.detailStatLabel}>Difficulty</Text>
                        <View style={styles.difficultyBar}>
                          <View
                            style={[
                              styles.difficultyFill,
                              {
                                width: `${(selectedProfessor.difficulty / 5) * 100}%`,
                                backgroundColor:
                                  selectedProfessor.difficulty <= 2
                                    ? '#2ecc71'
                                    : selectedProfessor.difficulty <= 3.5
                                    ? '#f39c12'
                                    : '#e74c3c',
                              },
                            ]}
                          />
                        </View>
                      </View>
                      <View style={styles.detailStatCard}>
                        <Text style={styles.detailStatValue}>
                          {Math.round(selectedProfessor.wouldTakeAgain * 100)}%
                        </Text>
                        <Text style={styles.detailStatLabel}>Would Take Again</Text>
                      </View>
                    </View>

                    <View style={styles.coursesSection}>
                      <Text style={styles.sectionTitle}>Courses Taught</Text>
                      <View style={styles.coursesGrid}>
                        {selectedProfessor.courses.map((course, index) => (
                          <View key={index} style={styles.courseTagLarge}>
                            <Text style={styles.courseTagLargeText}>{course}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  </View>

                  {/* Reviews Section */}
                  <View style={styles.reviewsSection}>
                    <View style={styles.reviewsSectionHeader}>
                      <Text style={styles.sectionTitle}>Reviews</Text>
                      <TouchableOpacity
                        style={styles.addReviewButton}
                        onPress={() => {
                          setSelectedProfessor(null)
                          setShowReviewModal(true)
                        }}
                      >
                        <Ionicons
                          name="add-circle"
                          size={hp(2)}
                          color={theme.colors.bondedPurple}
                        />
                        <Text style={styles.addReviewText}>Add Review</Text>
                      </TouchableOpacity>
                    </View>

                    {reviews[selectedProfessor.id] ? (
                      <FlatList
                        data={reviews[selectedProfessor.id]}
                        renderItem={renderReview}
                        keyExtractor={(item) => item.id}
                        scrollEnabled={false}
                      />
                    ) : (
                      <View style={styles.noReviews}>
                        <Ionicons
                          name="document-text-outline"
                          size={hp(4)}
                          color={theme.colors.softBlack}
                          style={{ opacity: 0.3 }}
                        />
                        <Text style={styles.noReviewsText}>No reviews yet</Text>
                        <Text style={styles.noReviewsSubtext}>
                          Be the first to review this professor!
                        </Text>
                      </View>
                    )}
                  </View>
                </ScrollView>
              </View>
            </SafeAreaView>
          </Modal>
        )}

        {/* Add Review Modal */}
        {showReviewModal && (
          <Modal
            visible={showReviewModal}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={() => setShowReviewModal(false)}
          >
            <AddReviewModal
              professor={selectedProfessor || MOCK_PROFESSORS[0]}
              onClose={() => {
                setShowReviewModal(false)
                if (selectedProfessor) {
                  setSelectedProfessor(null)
                }
              }}
            />
          </Modal>
        )}

        {/* Share Modal */}
        <ShareModal
          visible={showShareModal}
          content={shareContent}
          onClose={() => {
            setShowShareModal(false)
            setShareContent(null)
          }}
        />

        <BottomNav />
      </View>
    </SafeAreaView>
  )
}

// Add Review Modal Component
function AddReviewModal({ professor, onClose }) {
  const [course, setCourse] = useState('')
  const [rating, setRating] = useState(5)
  const [difficulty, setDifficulty] = useState(3)
  const [wouldTakeAgain, setWouldTakeAgain] = useState(true)
  const [grade, setGrade] = useState('A')
  const [reviewText, setReviewText] = useState('')

  const grades = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D', 'F']

  const handleSubmit = () => {
    // TODO: Submit review
    onClose()
  }

  return (
    <SafeAreaView style={styles.modalSafeArea} edges={['top', 'left', 'right']}>
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
            <Ionicons name="close" size={hp(2.5)} color={theme.colors.charcoal} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Add Review</Text>
          <TouchableOpacity onPress={handleSubmit} style={styles.modalSubmitButton}>
            <Text style={styles.modalSubmitText}>Submit</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.modalScrollView}
          contentContainerStyle={styles.modalScrollContent}
        >
          <View style={styles.addReviewContainer}>
            <Text style={styles.addReviewProfessorName}>{professor.name}</Text>
            <Text style={styles.addReviewProfessorDept}>{professor.department}</Text>

            <View style={styles.addReviewSection}>
              <Text style={styles.addReviewLabel}>Course *</Text>
              <Picker
                options={professor.courses.map((c) => ({ value: c, label: c }))}
                value={course}
                onValueChange={setCourse}
                placeholder="Select course"
              />
            </View>

            <View style={styles.addReviewSection}>
              <Text style={styles.addReviewLabel}>Overall Rating *</Text>
              <View style={styles.ratingSelector}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => setRating(star)}
                    style={styles.starButton}
                  >
                    <Ionicons
                      name={star <= rating ? 'star' : 'star-outline'}
                      size={hp(4)}
                      color={star <= rating ? '#FFD700' : '#CCCCCC'}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.addReviewSection}>
              <Text style={styles.addReviewLabel}>Difficulty (1-5) *</Text>
              <View style={styles.difficultySelector}>
                {[1, 2, 3, 4, 5].map((level) => (
                  <TouchableOpacity
                    key={level}
                    onPress={() => setDifficulty(level)}
                    style={[
                      styles.difficultyButton,
                      difficulty >= level && styles.difficultyButtonActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.difficultyButtonText,
                        difficulty >= level && styles.difficultyButtonTextActive,
                      ]}
                    >
                      {level}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.addReviewSection}>
              <Text style={styles.addReviewLabel}>Grade Received</Text>
              <View style={styles.gradeSelector}>
                {grades.map((g) => (
                  <TouchableOpacity
                    key={g}
                    onPress={() => setGrade(g)}
                    style={[
                      styles.gradeButton,
                      grade === g && styles.gradeButtonActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.gradeButtonText,
                        grade === g && styles.gradeButtonTextActive,
                      ]}
                    >
                      {g}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.addReviewSection}>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  wouldTakeAgain && styles.toggleButtonActive,
                ]}
                onPress={() => setWouldTakeAgain(!wouldTakeAgain)}
              >
                <Ionicons
                  name={wouldTakeAgain ? 'checkmark-circle' : 'checkmark-circle-outline'}
                  size={hp(2.5)}
                  color={wouldTakeAgain ? theme.colors.bondedPurple : theme.colors.softBlack}
                />
                <Text
                  style={[
                    styles.toggleButtonText,
                    wouldTakeAgain && styles.toggleButtonTextActive,
                  ]}
                >
                  Would Take Again
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.addReviewSection}>
              <Text style={styles.addReviewLabel}>Your Review *</Text>
              <TextInput
                style={styles.reviewTextInput}
                placeholder="Share your experience with this professor..."
                placeholderTextColor={theme.colors.textSecondary + '60'}
                value={reviewText}
                onChangeText={setReviewText}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  )
}

const createStyles = (theme) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: wp(4),
    paddingBottom: hp(10),
  },
  header: {
    marginBottom: hp(2),
  },
  title: {
    fontSize: hp(3.5),
    fontFamily: theme.typography.fontFamily.heading,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    marginBottom: hp(0.5),
  },
  subtitle: {
    fontSize: hp(1.7),
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
    opacity: 0.7,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.xl,
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
    marginBottom: hp(2),
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  searchIcon: {
    marginRight: wp(2),
    opacity: 0.6,
  },
  searchInput: {
    flex: 1,
    fontSize: hp(1.7),
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textPrimary,
  },
  clearButton: {
    padding: hp(0.5),
  },
  filtersRow: {
    flexDirection: 'row',
    gap: wp(2),
    marginBottom: hp(2),
  },
  filterGroup: {
    flex: 1,
  },
  filterLabel: {
    fontSize: hp(1.5),
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: hp(0.8),
  },
  resultsCount: {
    fontSize: hp(1.6),
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
    opacity: 0.7,
    marginBottom: hp(1.5),
  },
  professorsList: {
    gap: hp(2),
  },
  professorCard: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.lg,
    padding: wp(4),
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  professorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: hp(1),
  },
  professorInfo: {
    flex: 1,
  },
  professorName: {
    fontSize: hp(2.2),
    fontFamily: theme.typography.fontFamily.heading,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: hp(0.3),
  },
  professorDept: {
    fontSize: hp(1.5),
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
    opacity: 0.7,
  },
  ratingBadge: {
    backgroundColor: theme.colors.bondedPurple,
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.8),
    borderRadius: theme.radius.pill,
  },
  ratingNumber: {
    fontSize: hp(2),
    fontFamily: theme.typography.fontFamily.heading,
    fontWeight: '700',
    color: theme.colors.white,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
    marginBottom: hp(1.5),
  },
  ratingItem: {
    flexDirection: 'row',
    gap: wp(0.5),
  },
  ratingText: {
    fontSize: hp(1.4),
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
    opacity: 0.7,
  },
  statsRow: {
    flexDirection: 'row',
    gap: wp(4),
    marginBottom: hp(1.5),
    paddingBottom: hp(1.5),
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.offWhite,
  },
  statItem: {
    flex: 1,
  },
  statLabel: {
    fontSize: hp(1.3),
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
    opacity: 0.7,
    marginBottom: hp(0.5),
  },
  difficultyBar: {
    height: hp(0.6),
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.radius.sm,
    marginBottom: hp(0.3),
    overflow: 'hidden',
  },
  difficultyFill: {
    height: '100%',
    borderRadius: theme.radius.sm,
  },
  statValue: {
    fontSize: hp(1.6),
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  coursesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: wp(1.5),
    marginBottom: hp(1),
  },
  coursesLabel: {
    fontSize: hp(1.4),
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginRight: wp(1),
  },
  courseTag: {
    backgroundColor: theme.colors.bondedPurple + '15',
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(0.4),
    borderRadius: theme.radius.sm,
  },
  courseTagText: {
    fontSize: hp(1.3),
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.bondedPurple,
    fontWeight: '600',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(1.5),
  },
  tag: {
    backgroundColor: theme.colors.backgroundSecondary,
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(0.5),
    borderRadius: theme.radius.pill,
  },
  tagText: {
    fontSize: hp(1.2),
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
  },
  modalSafeArea: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(4),
    paddingVertical: hp(2),
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.offWhite,
    backgroundColor: theme.colors.background,
  },
  modalCloseButton: {
    padding: hp(0.5),
  },
  modalTitle: {
    fontSize: hp(2.2),
    fontFamily: theme.typography.fontFamily.heading,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  modalAddButton: {
    padding: hp(0.5),
  },
  modalSubmitButton: {
    padding: hp(0.5),
  },
  modalSubmitText: {
    fontSize: hp(1.8),
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '600',
    color: theme.colors.bondedPurple,
  },
  modalScrollView: {
    flex: 1,
  },
  modalScrollContent: {
    padding: wp(4),
    paddingBottom: hp(10),
  },
  professorDetailHeader: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.lg,
    padding: wp(4),
    marginBottom: hp(2),
  },
  professorDetailName: {
    fontSize: hp(3),
    fontFamily: theme.typography.fontFamily.heading,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    marginBottom: hp(0.5),
  },
  professorDetailDept: {
    fontSize: hp(1.8),
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
    opacity: 0.7,
    marginBottom: hp(2),
  },
  professorDetailRating: {
    alignItems: 'center',
    marginBottom: hp(2),
    paddingBottom: hp(2),
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.offWhite,
  },
  ratingDisplay: {
    alignItems: 'center',
  },
  ratingDisplayNumber: {
    fontSize: hp(4.5),
    fontFamily: theme.typography.fontFamily.heading,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    marginBottom: hp(0.5),
  },
  ratingDisplayStars: {
    flexDirection: 'row',
    gap: wp(1),
    marginBottom: hp(0.5),
  },
  ratingDisplayCount: {
    fontSize: hp(1.5),
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
    opacity: 0.7,
  },
  professorDetailStats: {
    flexDirection: 'row',
    gap: wp(2),
    marginBottom: hp(2),
  },
  detailStatCard: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.radius.lg,
    padding: wp(3),
    alignItems: 'center',
  },
  detailStatValue: {
    fontSize: hp(2.5),
    fontFamily: theme.typography.fontFamily.heading,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: hp(0.3),
  },
  detailStatLabel: {
    fontSize: hp(1.3),
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
    opacity: 0.7,
    marginBottom: hp(0.5),
  },
  coursesSection: {
    marginTop: hp(1),
  },
  sectionTitle: {
    fontSize: hp(2),
    fontFamily: theme.typography.fontFamily.heading,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: hp(1.5),
  },
  coursesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(2),
  },
  courseTagLarge: {
    backgroundColor: theme.colors.bondedPurple + '15',
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.8),
    borderRadius: theme.radius.md,
  },
  courseTagLargeText: {
    fontSize: hp(1.6),
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.bondedPurple,
    fontWeight: '600',
  },
  reviewsSection: {
    marginTop: hp(1),
  },
  reviewsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(1.5),
  },
  addReviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.5),
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.8),
    backgroundColor: theme.colors.bondedPurple + '15',
    borderRadius: theme.radius.pill,
  },
  addReviewText: {
    fontSize: hp(1.5),
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '600',
    color: theme.colors.bondedPurple,
  },
  reviewCard: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.lg,
    padding: wp(4),
    marginBottom: hp(2),
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: hp(1),
  },
  reviewHeaderLeft: {
    flex: 1,
  },
  reviewCourse: {
    fontSize: hp(1.8),
    fontFamily: theme.typography.fontFamily.heading,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: hp(0.5),
  },
  reviewRating: {
    flexDirection: 'row',
    gap: wp(0.5),
  },
  reviewDate: {
    fontSize: hp(1.3),
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
    opacity: 0.7,
  },
  reviewStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(3),
    marginBottom: hp(1.5),
    paddingBottom: hp(1.5),
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.offWhite,
  },
  reviewStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1),
  },
  reviewStatText: {
    fontSize: hp(1.4),
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
  },
  reviewText: {
    fontSize: hp(1.6),
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textPrimary,
    lineHeight: hp(2.4),
    marginBottom: hp(1),
  },
  reviewFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  helpfulButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1),
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.5),
  },
  helpfulText: {
    fontSize: hp(1.3),
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
    opacity: 0.7,
  },
  noReviews: {
    alignItems: 'center',
    paddingVertical: hp(6),
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.lg,
  },
  noReviewsText: {
    fontSize: hp(1.8),
    fontFamily: theme.typography.fontFamily.heading,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginTop: hp(1.5),
    marginBottom: hp(0.5),
  },
  noReviewsSubtext: {
    fontSize: hp(1.4),
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
    opacity: 0.7,
  },
  addReviewContainer: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.lg,
    padding: wp(4),
  },
  addReviewProfessorName: {
    fontSize: hp(2.5),
    fontFamily: theme.typography.fontFamily.heading,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: hp(0.3),
  },
  addReviewProfessorDept: {
    fontSize: hp(1.6),
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
    opacity: 0.7,
    marginBottom: hp(3),
  },
  addReviewSection: {
    marginBottom: hp(2.5),
  },
  addReviewLabel: {
    fontSize: hp(1.7),
    fontFamily: theme.typography.fontFamily.heading,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: hp(1),
  },
  ratingSelector: {
    flexDirection: 'row',
    gap: wp(2),
    justifyContent: 'center',
  },
  starButton: {
    padding: hp(0.5),
  },
  difficultySelector: {
    flexDirection: 'row',
    gap: wp(2),
  },
  difficultyButton: {
    flex: 1,
    paddingVertical: hp(1.5),
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  difficultyButtonActive: {
    backgroundColor: theme.colors.bondedPurple + '15',
    borderColor: theme.colors.bondedPurple,
  },
  difficultyButtonText: {
    fontSize: hp(2),
    fontFamily: theme.typography.fontFamily.heading,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  difficultyButtonTextActive: {
    color: theme.colors.bondedPurple,
  },
  gradeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(1.5),
  },
  gradeButton: {
    paddingHorizontal: wp(3),
    paddingVertical: hp(1),
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: 2,
    borderColor: 'transparent',
    minWidth: wp(12),
    alignItems: 'center',
  },
  gradeButtonActive: {
    backgroundColor: theme.colors.bondedPurple + '15',
    borderColor: theme.colors.bondedPurple,
  },
  gradeButtonText: {
    fontSize: hp(1.6),
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  gradeButtonTextActive: {
    color: theme.colors.bondedPurple,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
    paddingVertical: hp(1),
  },
  toggleButtonActive: {},
  toggleButtonText: {
    fontSize: hp(1.7),
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
  },
  toggleButtonTextActive: {
    color: theme.colors.bondedPurple,
    fontWeight: '600',
  },
  reviewTextInput: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.radius.lg,
    padding: wp(4),
    fontSize: hp(1.7),
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textPrimary,
    minHeight: hp(15),
    textAlignVertical: 'top',
  },
})

