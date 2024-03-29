import {
  CheckIcon,
  PlusIcon,
  ThumbUpIcon,
  VolumeOffIcon,
  VolumeUpIcon,
  XIcon,
} from '@heroicons/react/outline'
import MuiModal from '@mui/material/Modal'
import {
  collection,
  deleteDoc,
  doc,
  DocumentData,
  onSnapshot,
  setDoc,
} from 'firebase/firestore'
import { db } from '../firebase'
import React, { useEffect, useState } from 'react'
import toast, { Toaster } from 'react-hot-toast'
import { FaPlay } from 'react-icons/fa'
import ReactPlayer from 'react-player/lazy' //remember to make it '/lazy' for lazy loading
import { useRecoilState } from 'recoil'
import { modalState, movieState } from '../atoms/modalAtom'
import useAuth from '../hooks/useAuth'
import { Genre, Movie, Element } from '../typing'
import { by639_1 } from 'iso-language-codes'

function Modal() {
  const [showModal, setShodwModal] = useRecoilState(modalState)
  const [movie, setMovie] = useRecoilState(movieState)
  const [genres, setGenres] = useState<Genre[]>([])
  const [trailerLoading, setTrailerLoading] = useState<boolean>(false)
  const [trailerError, setTrailerError] = useState<boolean>(false)
  const [trailer, setTrailer] = useState<string | string[]>('')
  const [muted, setMuted] = useState(false)
  const [addedToList, setAddedToList] = useState(false)
  const { user } = useAuth()
  const [movies, setMovies] = useState<DocumentData[] | Movie[]>([])

  const toastStyle = {
    background: 'white',
    color: 'black',
    fontWeight: 'bold',
    fontSize: '16px',
    padding: '15px',
    borderRadius: '9999px',
    maxWidth: '1000px',
  }

  useEffect(() => {
    if (!movie) return

    async function fetchMovie() {
      setTrailerLoading(true)
      const url = `https://api.themoviedb.org/3/${
        movie?.media_type ? movie?.media_type : movie?.type
      }/${movie?.id}?api_key=${
        process.env.NEXT_PUBLIC_API_KEY
      }&language=en-US&append_to_response=videos`

      const data = await fetch(url)
        .then((response) => response.json())
        .catch((_err) => {
          setTrailerError(true)
          return
        })

      if (data?.videos) {
        const index = data.videos.results.findIndex(
          (element: Element) => element.type === 'Trailer'
        )

        setTrailer(data.videos?.results[index]?.key)
      }
      if (data?.genres) {
        setGenres(data.genres)
      }
      setTrailerLoading(false)
    }

    fetchMovie()
  }, [movie])

  // Find all the movies in the user's list
  useEffect(() => {
    if (user) {
      return onSnapshot(
        collection(db, 'customers', user.uid, 'myList'),
        (snapshot) => setMovies(snapshot.docs)
      )
    }
  }, [db, movie?.id])

  // Check if the movie is already in the user's list
  useEffect(
    () =>
      setAddedToList(
        movies.findIndex((result) => result.data().id === movie?.id) !== -1
      ),
    [movies]
  )

  const handleList = async () => {
    if (addedToList) {
      await deleteDoc(
        doc(db, 'customers', user!.uid, 'myList', movie?.id.toString()!)
      )

      toast(
        `${movie?.title || movie?.original_name} has been removed from My List`,
        {
          duration: 8000,
          style: toastStyle,
        }
      )
    } else {
      await setDoc(
        doc(db, 'customers', user!.uid, 'myList', movie?.id.toString()!),
        {
          ...movie,
        }
      )

      toast(
        `${movie?.title || movie?.original_name} has been added to My List.`,
        {
          duration: 8000,
          style: toastStyle,
        }
      )
    }
  }

  const handleClose = () => {
    setShodwModal(false)
  }

  return (
    <MuiModal
      open={showModal}
      onClose={handleClose}
      className="!md:top-7 fixed !top-14 left-0 right-0 z-50 mx-auto w-full max-w-5xl overflow-hidden overflow-y-scroll rounded-md scrollbar-hide"
    >
      <>
        <Toaster position="bottom-center" />
        <button
          onClick={handleClose}
          className="modalButton absolute right-5 top-5 !z-40 h-9 w-9 border-none bg-[#181818] hover:bg-[#181818]"
        >
          <XIcon className="h-6 w-6" />
        </button>
        {/* the 3rd party video player */}
        {/* the exact styling to make it responsive with that strange margin top value is provided by the Docs*/}
        <div className="relative bg-black pt-[56.25%]">
          {trailer ? (
            <ReactPlayer
              url={`https://www.youtube.com/watch?v=${trailer}`}
              width="100%"
              height="100%"
              style={{ position: 'absolute', top: '0', left: '0' }}
              playing
              muted={muted}
            />
          ) : (
            <div className="absolute top-[35%] flex w-full items-center justify-center md:top-[50%]">
              <p className="inline-block text-2xl font-semibold text-gray-400">
                {trailerLoading
                  ? 'Loading...'
                  : trailerError
                  ? 'Sorry, video is unavailable'
                  : 'Sorry, video is unavailable'}
              </p>
            </div>
          )}

          <div className="absolute bottom-4 flex w-full items-center justify-between px-4 md:bottom-10 md:px-10">
            <div className="flex space-x-4 md:space-x-2">
              <button className="flex items-center gap-x-2 rounded bg-white px-4 text-base font-bold text-black transition hover:bg-[#e6e6e6] md:px-8 md:text-xl">
                <FaPlay className="h-4 w-4 text-black md:h-7 md:w-7" />
                Play
              </button>
              <button className="modalButton" onClick={handleList}>
                {addedToList ? (
                  <CheckIcon className="h-4 w-4 md:h-7 md:w-7" />
                ) : (
                  <PlusIcon className="h-4 w-4 md:h-7 md:w-7" />
                )}
              </button>
              <button className="modalButton">
                <ThumbUpIcon className="h-4 w-4 md:h-6 md:w-6" />
              </button>
            </div>
            <button className="modalButton" onClick={() => setMuted(!muted)}>
              {muted ? (
                <VolumeOffIcon className="h-4 w-4 md:h-6 md:w-6" />
              ) : (
                <VolumeUpIcon className="h-4 w-4 md:h-6 md:w-6" />
              )}
            </button>
          </div>
        </div>

        <div className="flex space-x-16 rounded-b-md bg-[#181818] px-4 py-8 md:px-10">
          <div className="space-y-6 text-lg">
            <div className="flex items-center space-x-2 text-sm">
              <p className="font-semibold text-green-400">
                {(movie!.vote_average * 10).toFixed(2)}% Match
              </p>
              <p className="font-light">
                {movie?.release_date || movie?.first_air_date}
              </p>
              <div className="flex h-4 items-center justify-center rounded border border-white/40 px-1.5 text-xs">
                HD
              </div>
            </div>
            <div className="flex flex-col gap-x-10 gap-y-4 font-light md:flex-row">
              <p className="text-base md:w-5/6">{movie?.overview}</p>
              <div className="flex flex-col space-y-3 text-sm">
                <div>
                  <span className="text-[gray]">Genres:</span>{' '}
                  {genres.map((genre) => genre.name).join(', ')}
                </div>

                <div>
                  <span className="text-[gray]">Language:</span>{' '}
                  {by639_1[movie?.original_language].name}
                </div>

                <div>
                  <span className="text-[gray]">Total votes:</span>{' '}
                  {movie?.vote_count}
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    </MuiModal>
  )
}

export default React.memo(Modal)
